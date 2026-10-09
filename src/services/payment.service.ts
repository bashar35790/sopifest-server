import crypto from "crypto";
import Stripe from "stripe";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/appError";

const toCents = (amount: number) => Math.round(amount * 100);

const getStripe = (): Stripe | null => {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY);
};

export interface PaymentIntentResult {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentRef: string;
  clientSecret: string | null;
  mode: "stripe" | "mock";
}

/**
 * Create a payment intent for an order.
 *
 * Zero-trust: amount comes from the DB order total, never the client.
 * Only PENDING orders owned by the caller with paymentMethod STRIPE
 * can get an intent. COD orders never reach Stripe.
 */
export const createPaymentIntent = async (
  userId: string,
  orderId: string
): Promise<PaymentIntentResult> => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) {
    throw new AppError("Order not found", 404);
  }
  if (order.paymentMethod !== "STRIPE") {
    throw new AppError("Order is not a Stripe online-payment order", 400);
  }
  if (order.paymentStatus !== "PENDING") {
    throw new AppError(
      `Order payment is already ${order.paymentStatus.toLowerCase()}`,
      400
    );
  }
  if (order.orderStatus !== "PENDING") {
    throw new AppError(
      `Order can no longer be paid (status: ${order.orderStatus})`,
      400
    );
  }

  const stripe = getStripe();

  // Mock mode: no keys provisioned yet (dev/test). Returns a synthetic
  // ref so checkout UI + webhook flow are testable end to end.
  if (!stripe) {
    const paymentRef = `mock_pi_${order.id.slice(-8)}_${Date.now().toString(36)}`;
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentRef },
    });
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: env.STRIPE_CURRENCY,
      paymentRef,
      clientSecret: null,
      mode: "mock",
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: toCents(order.total),
    currency: env.STRIPE_CURRENCY,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentRef: intent.id },
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.total,
    currency: env.STRIPE_CURRENCY,
    paymentRef: intent.id,
    clientSecret: intent.client_secret,
    mode: "stripe",
  };
};

export interface WebhookResult {
  received: boolean;
  orderId: string;
  alreadyPaid: boolean;
}

interface WebhookEvent {
  type: string;
  orderId: string | null;
  paymentRef: string | null;
}

/**
 * Parse + verify a Stripe webhook event from the RAW body buffer.
 * Uses stripe.webhooks.constructEvent when STRIPE_WEBHOOK_SECRET is set
 * (real cryptographic verification); falls back to a tx/timestamp HMAC
 * check only in mock mode so the flow stays testable without live keys.
 */
const parseWebhookEvent = (rawBody: Buffer, signature: string): WebhookEvent => {
  const stripe = getStripe();

  if (stripe && env.STRIPE_WEBHOOK_SECRET) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch {
      throw new AppError("Invalid webhook signature", 400);
    }
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId =
        intent.metadata?.orderId ??
        (typeof intent.description === "string" ? intent.description : null);
      return { type: event.type, orderId, paymentRef: intent.id };
    }
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        type: event.type,
        orderId: intent.metadata?.orderId ?? null,
        paymentRef: intent.id,
      };
    }
    return { type: event.type, orderId: null, paymentRef: null };
  }

  // Mock-mode verification: HMAC-SHA256 over raw body with the webhook
  // secret (or a dev fallback), compared in constant time.
  const secret = env.STRIPE_WEBHOOK_SECRET ?? "mock_webhook_secret_dev";
  const [prefix, ts, sig] = signature.split(".");
  if (prefix !== "mock" || !ts || !sig) {
    throw new AppError("Invalid webhook signature", 400);
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${rawBody.toString("utf8")}`)
    .digest("hex");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new AppError("Invalid webhook signature", 400);
  }
  let parsed: any = null;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new AppError("Malformed webhook payload", 400);
  }
  return {
    type: parsed.type ?? "",
    orderId: parsed?.data?.object?.metadata?.orderId ?? null,
    paymentRef: parsed?.data?.object?.id ?? null,
  };
};

/** Sign a mock webhook payload (dev/test helper, mirrors parse logic). */
export const signMockWebhook = (rawBody: string): string => {
  const secret = env.STRIPE_WEBHOOK_SECRET ?? "mock_webhook_secret_dev";
  const ts = Date.now().toString();
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${rawBody}`)
    .digest("hex");
  return `mock.${ts}.${sig}`;
};

/**
 * Handle a verified webhook event.
 *
 * Idempotent: if the order is already PAID the event is acknowledged
 * without a second write. Only PENDING orders move to PAID/PROCESSING.
 * Failed intents mark FAILED (stock stays reserved for manual review).
 */
export const handleWebhook = async (
  rawBody: Buffer,
  signature: string | undefined
): Promise<WebhookResult> => {
  if (!signature) {
    throw new AppError("Missing webhook signature", 400);
  }

  const event = parseWebhookEvent(rawBody, signature);

  if (event.type === "payment_intent.succeeded") {
    if (!event.orderId) {
      throw new AppError("Webhook event has no order reference", 400);
    }
    const order = await prisma.order.findUnique({
      where: { id: event.orderId },
    });
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    if (order.paymentStatus === "PAID") {
      return { received: true, orderId: order.id, alreadyPaid: true };
    }
    if (order.paymentStatus !== "PENDING" || order.orderStatus !== "PENDING") {
      throw new AppError(
        `Order can no longer be paid (payment: ${order.paymentStatus}, status: ${order.orderStatus})`,
        400
      );
    }
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        orderStatus: "PROCESSING",
        paymentRef: event.paymentRef ?? order.paymentRef,
      },
    });
    return { received: true, orderId: order.id, alreadyPaid: false };
  }

  if (event.type === "payment_intent.payment_failed") {
    if (!event.orderId) {
      throw new AppError("Webhook event has no order reference", 400);
    }
    const order = await prisma.order.findUnique({
      where: { id: event.orderId },
    });
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    if (order.paymentStatus === "PENDING") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
          paymentRef: event.paymentRef ?? order.paymentRef,
        },
      });
    }
    return { received: true, orderId: order.id, alreadyPaid: false };
  }

  // Unknown event types are acknowledged so Stripe stops retrying.
  if (!event.orderId) {
    return { received: true, orderId: "", alreadyPaid: false };
  }
  return { received: true, orderId: event.orderId, alreadyPaid: false };
};
