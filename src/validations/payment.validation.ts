import { z } from "zod";

export const createIntentSchema = z.object({
  body: z.object({
    orderId: z
      .string({ required_error: "Order ID is required" })
      .min(1)
      .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
        message: "Invalid order ID format",
      }),
  }),
});

export type CreateIntentInput = z.infer<typeof createIntentSchema>["body"];
