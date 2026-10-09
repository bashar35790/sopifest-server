import { prisma } from "../lib/prisma";
import { GetProductsQuery } from "../validations/product.validation";
import { Prisma } from "@prisma/client";

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
