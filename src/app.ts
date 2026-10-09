import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";

import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import adminRoutes from "./routes/admin.routes";
import userRoutes from "./routes/user.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes, { paymentWebhookRouter } from "./routes/payment.routes";

export const createApp = (): Application => {
  const app: Application = express();

  // Security HTTP headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );

  // Request logging
  if (env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  } else {
    app.use(morgan("combined"));
  }

  // Body parsing & Cookie parsing
  // NOTE: the Stripe webhook needs the exact raw bytes for signature
  // verification, so only the webhook router is mounted before
  // express.json. Everything else mounts after parsing below.
  app.use("/api/v1/payments/webhook", paymentWebhookRouter);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());

  // Routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/categories", categoryRoutes);
  app.use("/api/v1/products", productRoutes);
  app.use("/api/v1/admin", adminRoutes);
  // User router carries full sub-paths (/wishlist, /cart/sync)
  app.use("/api/v1", userRoutes);
  // Zero-trust checkout (POST /api/v1/orders)
  app.use("/api/v1/orders", orderRoutes);
  // Payment intent (POST /api/v1/payments/create-intent).
  // Webhook (POST /api/v1/payments/webhook) was mounted pre-parsing above.
  app.use("/api/v1/payments", paymentRoutes);

  // Health check endpoint
  app.get("/api/v1/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "success",
      message: "API is healthy",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // Catch-all 404 for undefined routes
  app.all("*", notFoundHandler);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
