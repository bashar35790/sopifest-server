import { Router } from "express";
import * as ProductController from "../controllers/product.controller";
import { validate } from "../middlewares/validate.middleware";
import { getProductsQuerySchema } from "../validations/product.validation";

const router = Router();

router.get("/", validate(getProductsQuerySchema), ProductController.getProducts);

export default router;
