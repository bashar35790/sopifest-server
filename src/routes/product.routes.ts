import { Router } from "express";
import * as ProductController from "../controllers/product.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  getProductsQuerySchema,
  getProductBySlugSchema,
} from "../validations/product.validation";

const router = Router();

// Public routes only.
// Admin CRUD lives under /api/v1/admin/products (see admin.routes.ts).
router.get("/", validate(getProductsQuerySchema), ProductController.getProducts);
router.get("/:slug", validate(getProductBySlugSchema), ProductController.getProductBySlug);

export default router;
