import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/appError";
import { CreateOrderInput } from "../validations/order.validation";

// Zero-trust commerce constants.
// Single source of truth lives server-side; the client never sends prices.
const TAX_RATE = 0.05; // 5% VAT
const FREE_SHIPPING_THRESHOLD = 100; // subtotal-after-discount >= $100 ships free
const BASE_SHIPPING_FEE = 5; // flat fee under threshold
const HEAVY_WEIGHT_KG = 20; // orders heavier than this add a surcharge
const HEAVY_SURCHARGE = 10;

const MAX_ORDER_TOTAL = 100000;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

interface PricedLine {
  productId: string;
  variantId?: string;
  title: string;
  sku: string;
  image: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  attributes?: Record<string, unknown> | null;
  weightKg: number;
}

const generateOrderNumber = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${date}-${rand}`;
};

interface CouponResult {
  code: string | null;
  discountTotal: number;
}

// Validate a coupon against its rules and compute the discount on
// the authoritative subtotal. Throws 400 on any rule violation so a
// tampered/expired code can never reduce the total.
const resolveCoupon = async (
  tx: Prisma.TransactionClient,
  couponCode: string | undefined,
  subtotal: number
): Promise<CouponResult> => {
  if (!couponCode) return { code: null, discountTotal: 0 };

  const now = new Date();
  const coupon = await tx.coupon.findUnique({
    where: { code: couponCode },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError("Coupon code is invalid or inactive", 400);
  }
  if (coupon.startDate > now) {
    throw new AppError("Coupon is not yet active", 400);
  }
  if (coupon.expiryDate < now) {
    throw new AppError("Coupon has expired", 400);
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new AppError("Coupon usage limit reached", 400);
  }
  if (subtotal < coupon.minOrderValue) {
    throw new AppError(
      `Coupon requires a minimum order value of $${coupon.minOrderValue.toFixed(2)}`,
      400
    );
  }

  let discount = 0;
  if (coupon.discountPercent) {
    discount = (subtotal * coupon.discountPercent) / 100;
    if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else if (coupon.discountAmount) {
    discount = Math.min(coupon.discountAmount, subtotal);
  }

  return { code: coupon.code, discountTotal: round2(Math.max(0, discount)) };
}

/**
 * Zero-trust order creation.
 *
 * The client sends ONLY { productId, variantId, quantity } + address +
 * coupon code + payment method. Every price, discount, tax and shipping
 * figure is computed here from MongoDB, stock is reserved atomically,
 * and the order is inserted in the same transaction.
 */
export const createOrder = async (userId: string, input: CreateOrderInput) => {
  // Duplicate lines (same product+variant twice) merge so stock checks
  // and totals can't be split across entries.
  const merged = new Map<
    string,
    { productId: string; variantId?: string; quantity: number }
  >();
  for (const item of input.items) {
    const key = `${item.productId}::${item.variantId ?? ""}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, { ...item });
    }
  }
  const lines = [...merged.values()];

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    if (!user.isActive || user.isBanned) {
      throw new AppError("Account is not allowed to place orders", 403);
    }

    // 1. Price every line from the DB. Unknown product, unpublished
    //    status, unknown variant or insufficient stock aborts the order.
    const priced: PricedLine[] = [];
    let totalWeightKg = 0;

    for (const line of lines) {
      const product = await tx.product.findFirst({
        where: { id: line.productId, isDeleted: false },
      });

      if (!product) {
        throw new AppError(
          `Product ${line.productId} is no longer available`,
          400
        );
      }
      if (product.status !== "PUBLISHED") {
        throw new AppError(
          `"${product.title}" is currently ${product.status.toLowerCase().replace(/_/g, " ")}`,
          400
        );
      }

      const fallbackImage =
        product.images?.find((img) => img.isPrimary)?.url ??
        product.images?.[0]?.url ??
        "";
      const lineWeight = (product.weightKg ?? 0) * line.quantity;
      totalWeightKg += lineWeight;

      if (line.variantId) {
        const variant = (product.variants || []).find(
          (v) => v.id === line.variantId
        );
        if (!variant) {
          throw new AppError(
            `Selected variant for "${product.title}" no longer exists`,
            400
          );
        }
        if (variant.stockCount < line.quantity) {
          throw new AppError(
            `Only ${variant.stockCount} unit(s) of "${product.title} (${variant.title})" available`,
            400
          );
        }

        const unitPrice = variant.discountPrice ?? variant.price;
        priced.push({
          productId: product.id,
          variantId: variant.id,
          title: `${product.title} (${variant.title})`,
          sku: variant.sku,
          image: variant.image ?? fallbackImage,
          unitPrice,
          quantity: line.quantity,
          totalPrice: round2(unitPrice * line.quantity),
          attributes: (variant.attributes as Record<string, unknown>) ?? null,
          weightKg: lineWeight,
        });
        continue;
      }

      if (product.stockCount < line.quantity) {
        throw new AppError(
          `Only ${product.stockCount} unit(s) of "${product.title}" available`,
          400
        );
      }

      const unitPrice = product.discountPrice ?? product.basePrice;
      priced.push({
        productId: product.id,
        title: product.title,
        sku: product.sku,
        image: fallbackImage,
        unitPrice,
        quantity: line.quantity,
        totalPrice: round2(unitPrice * line.quantity),
        attributes: null,
        weightKg: lineWeight,
      });
    }
    // 2. Authoritative totals.
    const subtotal = round2(priced.reduce((sum, l) => sum + l.totalPrice, 0));
    if (subtotal <= 0) {
      throw new AppError("Order subtotal must be greater than zero", 400);
    }

    const { code: couponCode, discountTotal } = await resolveCoupon(
      tx,
      input.couponCode,
      subtotal
    );
    const afterDiscount = round2(subtotal - discountTotal);

    let shippingFee =
      afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING_FEE;
    if (totalWeightKg > HEAVY_WEIGHT_KG) {
      shippingFee = round2(shippingFee + HEAVY_SURCHARGE);
    }

    const tax = round2(afterDiscount * TAX_RATE);
    const total = round2(afterDiscount + shippingFee + tax);
    if (total > MAX_ORDER_TOTAL) {
      throw new AppError("Order total exceeds the maximum allowed value", 400);
    }
    // 3. Reserve stock atomically. Plain-product lines use a conditional
    //    updateMany (fails on concurrent races); variant lines rewrite
    //    the composite array with a post-check for negative stock.
    for (const line of priced) {
      if (line.variantId) {
        const current = await tx.product.findFirst({
          where: { id: line.productId, isDeleted: false },
        });
        const variants = (current?.variants || []).map((v) =>
          v.id === line.variantId
            ? { ...v, stockCount: v.stockCount - line.quantity }
            : v
        );
        const variantAfter = variants.find((v) => v.id === line.variantId);
        if (!variantAfter || variantAfter.stockCount < 0) {
          throw new AppError(
            `Insufficient stock for "${line.title}" — please retry`,
            409
          );
        }
        await tx.product.update({
          where: { id: line.productId },
          data: {
            variants: {
              set: variants as unknown as never,
            },
            stockCount: { decrement: line.quantity },
          },
        });
      } else {
        const updated = await tx.product.updateMany({
          where: {
            id: line.productId,
            isDeleted: false,
            stockCount: { gte: line.quantity },
          },
          data: { stockCount: { decrement: line.quantity } },
        });
        if (updated.count === 0) {
          throw new AppError(
            `Insufficient stock for "${line.title}" — please retry`,
            409
          );
        }
      }
    }
    // 4. Consume coupon usage (only when a coupon was applied).
    //    Re-read inside the tx so a concurrent checkout can't overspend
    //    the usageLimit between validation and increment.
    if (couponCode) {
      const fresh = await tx.coupon.findUnique({
        where: { code: couponCode },
      });
      if (
        !fresh ||
        !fresh.isActive ||
        (fresh.usageLimit !== null && fresh.usageCount >= fresh.usageLimit)
      ) {
        throw new AppError("Coupon usage limit reached", 400);
      }
      await tx.coupon.update({
        where: { code: couponCode },
        data: { usageCount: { increment: 1 } },
      });
    }

    // 5. Insert the order. Prices snapshotted per line so receipts are
    //    immutable even if catalogue prices change later.
    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        items: priced.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          title: l.title,
          sku: l.sku,
          image: l.image,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          totalPrice: l.totalPrice,
          attributes: (l.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
        shippingAddress: { ...input.shippingAddress },
        paymentMethod: input.paymentMethod,
        paymentStatus: "PENDING",
        orderStatus: "PENDING",
        subtotal,
        discountTotal,
        couponCode,
        shippingFee,
        tax,
        total,
        customerNotes: input.customerNotes,
      },
    });

    return order;
  });
};

