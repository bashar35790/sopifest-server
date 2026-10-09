import { Router } from "express";
import * as CategoryController from "../controllers/category.controller";
import { validate } from "../middlewares/validate.middleware";
import { createCategorySchema, updateCategorySchema, deleteCategorySchema, getCategorySchema } from "../validations/category.validation";
import { authenticate, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
router.get("/", CategoryController.getCategories);
router.get("/:id", validate(getCategorySchema), CategoryController.getCategory);

// Admin only routes
router.use(authenticate);
router.use(requireRole(["ADMIN", "STAFF"]));

router.post(
  "/admin",
  validate(createCategorySchema),
  CategoryController.createCategory
);

router.put(
  "/admin/:id",
  validate(updateCategorySchema),
  CategoryController.updateCategory
);

router.delete(
  "/admin/:id",
  validate(deleteCategorySchema),
  CategoryController.deleteCategory
);

export default router;
