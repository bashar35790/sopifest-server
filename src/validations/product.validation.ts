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

export const getProductBySlugSchema = z.object({
  params: z.object({
    slug: z.string({ required_error: "Product slug is required" }),
  }),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional(),
  title: z.string({ required_error: "Variant title is required" }),
  attributes: z.record(z.any()),
  price: z.number({ required_error: "Variant price is required" }).min(0),
  discountPrice: z.number().min(0).optional().nullable(),
  stockCount: z.number().int().min(0).default(0),
  image: z.string().url().optional().nullable(),
});

export const productImageSchema = z.object({
  url: z.string().url({ message: "Invalid image URL" }),
  publicId: z.string().optional().nullable(),
  alt: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
  order: z.number().int().default(0),
});

export const specificationSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const dimensionsSchema = z.object({
  length: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
  unit: z.string().default("cm"),
});

export const createProductSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Product title is required" }).min(2),
    slug: z.string().optional(),
    sku: z.string().optional(),
    brand: z.string().optional().nullable(),
    description: z.string({ required_error: "Product description is required" }).min(5),
    shortDescription: z.string().optional().nullable(),
    categoryId: z.string({ required_error: "Category ID is required" }),
    status: z.enum(["DRAFT", "PUBLISHED", "OUT_OF_STOCK", "ARCHIVED"]).default("PUBLISHED"),
    basePrice: z.number({ required_error: "Base price is required" }).min(0),
    discountPrice: z.number().min(0).optional().nullable(),
    images: z.array(productImageSchema).default([]),
    hasVariants: z.boolean().default(false),
    variants: z.array(productVariantSchema).default([]),
    specifications: z.array(specificationSchema).default([]),
    weightKg: z.number().min(0).optional().nullable(),
    dimensions: dimensionsSchema.optional().nullable(),
    stockCount: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(5),
    featured: z.boolean().default(false),
    isNewArrival: z.boolean().default(true),
    isTopSeller: z.boolean().default(false),
    metaTitle: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Product ID is required" }),
  }),
  body: z.object({
    title: z.string().min(2).optional(),
    slug: z.string().optional(),
    sku: z.string().optional(),
    brand: z.string().optional().nullable(),
    description: z.string().min(5).optional(),
    shortDescription: z.string().optional().nullable(),
    categoryId: z.string().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "OUT_OF_STOCK", "ARCHIVED"]).optional(),
    basePrice: z.number().min(0).optional(),
    discountPrice: z.number().min(0).optional().nullable(),
    images: z.array(productImageSchema).optional(),
    hasVariants: z.boolean().optional(),
    variants: z.array(productVariantSchema).optional(),
    specifications: z.array(specificationSchema).optional(),
    weightKg: z.number().min(0).optional().nullable(),
    dimensions: dimensionsSchema.optional().nullable(),
    stockCount: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    featured: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isTopSeller: z.boolean().optional(),
    metaTitle: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
  }),
});

export const deleteProductSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Product ID is required" }),
  }),
});

export const getProductByIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Product ID is required" }),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>["body"];
export type UpdateProductInput = z.infer<typeof updateProductSchema>["body"];

