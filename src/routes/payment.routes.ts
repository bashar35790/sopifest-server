import { Router } from "express";
import express from "express";
import * as PaymentController from "../controllers/payment.controller";
import { validate } from "../middlewares/validate.middleware";
import { createIntentSchema } from "../validations/payment.validation";
import { authenticate } from "../middlewares/auth.middleware";

/**
 * Public webhook router — mounted at /api/v1/payments/webhook BEFORE
 * express.json (see app.ts). express.raw preserves the exact body bytes
 * Stripe signed; signature is verified in payment.service before any
 * state change. No auth, no JSON parsing on this path.
 */
export const paymentWebhookRouter = Router();
paymentWebhookRouter.post(
  "/",
  express.raw({ type: "application/json", limit: "1mb" }),
  PaymentController.handleWebhook
);

/**
 * Authenticated payments router — mounted at /api/v1/payments AFTER
 * body parsing. Serves POST /create-intent.
 */
const router = Router();

router.post(
  "/create-intent",
  authenticate,
  validate(createIntentSchema),
  PaymentController.createIntent
);

export default router;
