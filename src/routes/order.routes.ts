import { Router } from "express";
import * as OrderController from "../controllers/order.controller";
import { validate } from "../middlewares/validate.middleware";
import { createOrderSchema } from "../validations/order.validation";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All order routes require authentication.
router.use(authenticate);

// Zero-trust order creation (POST /api/v1/orders)
router.post("/", validate(createOrderSchema), OrderController.createOrder);

export default router;
