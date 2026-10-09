import { prisma } from "../config/prisma";
import { CreateCategoryInput, UpdateCategoryInput } from "../validations/category.validation";
import slugify from "slugify";
import { AppError } from "../utils/appError";

export const generateSlug = async (name: string): Promise<string> => {
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

export const createCategory = async (data: CreateCategoryInput) => {
  const existing = await prisma.category.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new AppError("Category with this name already exists", 400);
  }

  const slug = await generateSlug(data.name);

  return prisma.category.create({
    data: {
      ...data,
      slug,
    },
  });
};

export const getCategories = async () => {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
};

export const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError("Category not found", 404);
  }
  return category;
};

export const updateCategory = async (id: string, data: UpdateCategoryInput) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  let slug = category.slug;

  if (data.name && data.name !== category.name) {
    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new AppError("Category with this name already exists", 400);
    }
    slug = await generateSlug(data.name);
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...data,
      ...(data.name ? { slug } : {}),
    },
  });
};

export const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const productsCount = await prisma.product.count({ where: { categoryId: id } });
  if (productsCount > 0) {
    throw new AppError("Cannot delete category with associated products", 400);
  }

  return prisma.category.delete({ where: { id } });
};
