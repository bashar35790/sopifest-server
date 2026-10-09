import { Router } from "express";
import * as UserController from "../controllers/user.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  toggleWishlistSchema,
  cartSyncSchema,
} from "../validations/user.validation";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// Wishlist endpoints (/api/v1/wishlist)
router.get("/wishlist", authenticate, UserController.getWishlist);

router.post(
  "/wishlist/:productId",
  authenticate,
  validate(toggleWishlistSchema),
  UserController.toggleWishlist
);

// Guest cart reconcile endpoint (/api/v1/cart/sync).
// Public so guests can refresh prices/stock; also used on login merge.
router.post("/cart/sync", validate(cartSyncSchema), UserController.syncCart);

export default router;
