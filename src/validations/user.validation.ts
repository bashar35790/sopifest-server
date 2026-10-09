import { z } from "zod";

export const toggleWishlistSchema = z.object({
  params: z.object({
    productId: z.string({ required_error: "Product ID is required" }).min(1),
  }),
});

export const cartSyncItemSchema = z.object({
  productId: z.string({ required_error: "Product ID is required" }).min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export const cartSyncSchema = z.object({
  body: z.object({
    items: z.array(cartSyncItemSchema).max(50).default([]),
  }),
});

export type ToggleWishlistInput = z.infer<typeof toggleWishlistSchema>["params"];
export type CartSyncInput = z.infer<typeof cartSyncSchema>["body"];
export type CartSyncItem = z.infer<typeof cartSyncItemSchema>;
