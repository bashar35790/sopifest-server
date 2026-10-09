import { Router } from "express";
import * as ProductController from "../controllers/product.controller";
import * as CategoryController from "../controllers/category.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createProductSchema,
  updateProductSchema,
  deleteProductSchema,
  getProductByIdSchema,
} from "../validations/product.validation";
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
} from "../validations/category.validation";
import { authenticate, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// Protect all admin routes
router.use(authenticate);
router.use(requireRole(["ADMIN", "STAFF"]));

// Product management endpoints (/api/v1/admin/products)
router.get(
  "/products/:id",
  validate(getProductByIdSchema),
  ProductController.getProductByIdAdmin
);

router.post(
  "/products",
  validate(createProductSchema),
  ProductController.createProduct
);

router.put(
  "/products/:id",
  validate(updateProductSchema),
  ProductController.updateProduct
);

router.delete(
  "/products/:id",
  validate(deleteProductSchema),
  ProductController.deleteProduct
);

// Category management endpoints (/api/v1/admin/categories)
router.post(
  "/categories",
  validate(createCategorySchema),
  CategoryController.createCategory
);

router.put(
  "/categories/:id",
  validate(updateCategorySchema),
  CategoryController.updateCategory
);

router.delete(
  "/categories/:id",
  validate(deleteCategorySchema),
  CategoryController.deleteCategory
);

export default router;
