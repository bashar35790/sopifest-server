import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema } from "../validations/auth.validation";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.getMe);

export default router;
