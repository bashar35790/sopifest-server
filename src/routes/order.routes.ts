import { Router } from "express";
import * as OrderController from "../controllers/order.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createOrderSchema,
  myOrdersQuerySchema,
  orderIdParamsSchema,
} from "../validations/order.validation";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All order routes require authentication.
router.use(authenticate);

// Zero-trust order creation (POST /api/v1/orders)
router.post("/", validate(createOrderSchema), OrderController.createOrder);

// NOTE: /my-orders must be registered before /:id so Express matches
// the literal route instead of treating "my-orders" as an order id.
// User order history (GET /api/v1/orders/my-orders)
router.get(
  "/my-orders",
  validate(myOrdersQuerySchema),
  OrderController.getMyOrders
);

// Order receipt (GET /api/v1/orders/:id, ownership enforced)
router.get(
  "/:id",
  validate(orderIdParamsSchema),
  OrderController.getOrderById
);

export default router;
