import { randomUUID } from "crypto";
import { prisma } from "../config/prisma";
import { GetProductsQuery, CreateProductInput, UpdateProductInput } from "../validations/product.validation";
import { Prisma } from "@prisma/client";
import slugify from "slugify";
import { AppError } from "../utils/appError";

export const getProducts = async (query: GetProductsQuery) => {
  const { page = 1, limit = 10, search, category, minPrice, maxPrice, brand, inStock, sort } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    isDeleted: false,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    // Determine if it's an ID or a slug based on simple hex check
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(category);
    if (isObjectId) {
      where.categoryId = category;
    } else {
      where.category = { slug: category };
    }
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.basePrice = {};
    if (minPrice !== undefined) where.basePrice.gte = minPrice;
    if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
  }

  if (brand) {
    where.brand = { equals: brand, mode: "insensitive" };
  }

  if (inStock) {
    where.stockCount = { gt: 0 };
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (sort) {
    switch (sort) {
      case "price-asc":
        orderBy = { basePrice: "asc" };
        break;
      case "price-desc":
        orderBy = { basePrice: "desc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "rating-desc":
        orderBy = { rating: "desc" };
        break;
    }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const generateProductSlug = async (name: string): Promise<string> => {
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

export const generateProductSKU = async (prefix: string = "PROD"): Promise<string> => {
  let sku = "";
  while (true) {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timePart = Date.now().toString(36).slice(-4).toUpperCase();
    sku = `${prefix}-${timePart}-${randomPart}`;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (!existing) break;
  }
  return sku;
};

export const getProductBySlug = async (slug: string) => {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      isDeleted: false,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      reviews: {
        where: { isApproved: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return product;
};

export const getProductByIdAdmin = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return product;
};

type VariantInput = {
  id?: string;
  sku?: string;
  title: string;
  attributes: Record<string, any>;
  price: number;
  discountPrice?: number | null;
  stockCount?: number;
  image?: string | null;
};

const normalizeVariants = (variants: VariantInput[], parentSku: string) =>
  variants.map((variant, index) => ({
    id: variant.id || randomUUID(),
    sku: variant.sku || `${parentSku}-V${index + 1}`,
    title: variant.title,
    attributes: variant.attributes,
    price: variant.price,
    discountPrice: variant.discountPrice ?? null,
    stockCount: variant.stockCount ?? 0,
    image: variant.image ?? null,
  }));

export const createProduct = async (data: CreateProductInput) => {
  // Check category
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  // Generate or sanitize slug
  let slug = data.slug ? slugify(data.slug, { lower: true, strict: true }) : await generateProductSlug(data.title);
  const existingSlug = await prisma.product.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = await generateProductSlug(data.slug || data.title);
  }

  // Generate or validate SKU
  let sku = data.sku;
  if (!sku) {
    sku = await generateProductSKU();
  } else {
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      throw new AppError("Product SKU already exists", 400);
    }
  }

  // Handle variants (auto-generate missing ids/skus)
  const variants = normalizeVariants((data.variants || []) as VariantInput[], sku);

  const hasVariants = data.hasVariants || variants.length > 0;

  // Compute stockCount if variants are present and stockCount was not explicitly provided or 0
  let stockCount = data.stockCount ?? 0;
  if (hasVariants && stockCount === 0 && variants.length > 0) {
    stockCount = variants.reduce((acc, v) => acc + (v.stockCount || 0), 0);
  }

  return prisma.product.create({
    data: {
      ...data,
      slug,
      sku,
      hasVariants,
      variants,
      stockCount,
      images: data.images || [],
      specifications: data.specifications || [],
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
};

export const updateProduct = async (id: string, data: UpdateProductInput) => {
  const existingProduct = await prisma.product.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existingProduct) {
    throw new AppError("Product not found", 404);
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new AppError("Category not found", 404);
    }
  }

  let slug = existingProduct.slug;
  if (data.slug && data.slug !== existingProduct.slug) {
    const normalizedSlug = slugify(data.slug, { lower: true, strict: true });
    const conflict = await prisma.product.findUnique({ where: { slug: normalizedSlug } });
    if (conflict) {
      throw new AppError("Slug already in use", 400);
    }
    slug = normalizedSlug;
  } else if (data.title && !data.slug && data.title !== existingProduct.title) {
    slug = await generateProductSlug(data.title);
  }

  if (data.sku && data.sku !== existingProduct.sku) {
    const conflictSku = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (conflictSku) {
      throw new AppError("Product SKU already exists", 400);
    }
  }

  let variants: ReturnType<typeof normalizeVariants> | undefined;
  let hasVariants = data.hasVariants !== undefined ? data.hasVariants : existingProduct.hasVariants;
  let stockCount = data.stockCount;
  if (data.variants) {
    variants = normalizeVariants(data.variants as VariantInput[], data.sku || existingProduct.sku);
    hasVariants = variants.length > 0;
    // Recompute aggregate stock when variants change and no explicit stockCount given
    if (stockCount === undefined && variants.length > 0) {
      stockCount = variants.reduce((acc, v) => acc + (v.stockCount || 0), 0);
    }
  }

  // Strip nested/variant fields from the raw patch; re-apply normalized values below.
  // (Prevents Prisma Checked/Unchecked XOR type conflict on optional categoryId.)
  const { variants: _v, hasVariants: _h, stockCount: _s, slug: _sl, ...rest } = data;

  return prisma.product.update({
    where: { id },
    data: {
      ...rest,
      slug,
      ...(variants ? { variants: variants as unknown as Prisma.ProductUpdateInput["variants"], hasVariants } : {}),
      ...(variants === undefined && data.hasVariants !== undefined ? { hasVariants } : {}),
      ...(stockCount !== undefined ? { stockCount } : {}),
    } as Prisma.ProductUpdateInput,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
};

export const deleteProduct = async (id: string) => {
  const existing = await prisma.product.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError("Product not found", 404);
  }

  return prisma.product.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
};

