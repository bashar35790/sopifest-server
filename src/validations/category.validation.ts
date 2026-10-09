import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2, "Name must be at least 2 characters long"),
    description: z.string().optional(),
    image: z.string({ required_error: "Image is required" }).url("Image must be a valid URL"),
    featured: z.boolean().optional(),
    parentId: z.string().optional()
  })
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    image: z.string().url().optional(),
    featured: z.boolean().optional(),
    parentId: z.string().optional().nullable()
  }),
  params: z.object({
    id: z.string({ required_error: "Category ID is required" })
  })
});

export const deleteCategorySchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Category ID is required" })
  })
});

export const getCategorySchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Category ID is required" })
  })
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>["body"];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>["body"];
