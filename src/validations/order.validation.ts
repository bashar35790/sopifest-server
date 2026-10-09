import { z } from "zod";

const objectIdLike = z
  .string({ required_error: "Product ID is required" })
  .min(1)
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid product ID format",
  });

export const orderItemSchema = z.object({
  productId: objectIdLike,
  variantId: z.string().min(1).optional(),
  quantity: z
    .number({ required_error: "Quantity is required" })
    .int()
    .min(1)
    .max(99),
});

export const shippingAddressSchema = z.object({
  fullName: z.string({ required_error: "Full name is required" }).min(2).max(100),
  phone: z.string({ required_error: "Phone number is required" }).min(5).max(20),
  streetAddress: z
    .string({ required_error: "Street address is required" })
    .min(5)
    .max(200),
  city: z.string({ required_error: "City is required" }).min(2).max(100),
  state: z.string({ required_error: "State is required" }).min(2).max(100),
  postalCode: z.string({ required_error: "Postal code is required" }).min(3).max(20),
  country: z.string({ required_error: "Country is required" }).min(2).max(100),
});

// Zero-trust: payload carries NO prices, totals, discounts or stock flags.
// The backend prices every line from MongoDB (discountPrice ?? basePrice).
export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(orderItemSchema)
      .min(1, { message: "Order must contain at least one item" })
      .max(50),
    shippingAddress: shippingAddressSchema,
    paymentMethod: z.enum(["COD", "STRIPE", "SSLCOMMERZ"], {
      required_error: "Payment method is required",
    }),
    couponCode: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .transform((val) => val.toUpperCase())
      .optional(),
    customerNotes: z.string().max(500).optional(),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>["body"];
export type OrderItemInput = z.infer<typeof orderItemSchema>;

const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

export const myOrdersQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(parseInt(val, 10), 50) : 10)),
    orderStatus: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  }),
});

export const orderIdParamsSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: "Order ID is required" })
      .min(1)
      .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
        message: "Invalid order ID format",
      }),
  }),
});

export type MyOrdersQuery = z.infer<typeof myOrdersQuerySchema>["query"];
export type OrderIdParams = z.infer<typeof orderIdParamsSchema>["params"];
