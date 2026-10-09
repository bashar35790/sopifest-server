import { Request, Response, NextFunction } from "express";
import * as PaymentService from "../services/payment.service";

export const createIntent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await PaymentService.createPaymentIntent(
      req.user!.userId,
      req.body.orderId as string
    );
    res.status(201).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Raw body buffer is attached by express.raw on this route
    // (see payment.routes.ts) — never JSON-parsed before verification.
    const rawBody = req.body as Buffer;
    const signature = req.headers["stripe-signature"] as string | undefined;
    const result = await PaymentService.handleWebhook(rawBody, signature);
    res.status(200).json({
      status: "success",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
