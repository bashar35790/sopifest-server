import { z } from "zod";

export const getProductsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 10)),
    search: z.string().optional(),
    category: z.string().optional(), // could be category ID or slug
    minPrice: z.string().optional().transform(val => (val ? parseFloat(val) : undefined)),
    maxPrice: z.string().optional().transform(val => (val ? parseFloat(val) : undefined)),
    brand: z.string().optional(),
    inStock: z.string().optional().transform(val => val === "true"),
    sort: z.enum(["price-asc", "price-desc", "newest", "rating-desc"]).optional(),
  })
});

export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>["query"];
