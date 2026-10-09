import { prisma } from "../config/prisma";
import { LowStockQuery } from "../validations/inventory.validation";

export interface LowStockVariant {
  id: string;
  sku: string;
  title: string;
  stockCount: number;
}

export interface LowStockItem {
  id: string;
  title: string;
  slug: string;
  sku: string;
  status: string;
  stockCount: number;
  lowStockThreshold: number;
  isOutOfStock: boolean;
  isProductLow: boolean;
  lowVariants: LowStockVariant[];
  category: { id: string; name: string; slug: string } | null;
  updatedAt: Date;
}

// Prisma cannot compare two columns (stockCount <= lowStockThreshold) in a
// `where` clause, so we fetch non-deleted products (most urgent first) and
// apply the per-product threshold comparison in memory.
export const getLowStockProducts = async (query: LowStockQuery) => {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit =
    query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 20;

  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      status: true,
      stockCount: true,
      lowStockThreshold: true,
      hasVariants: true,
      variants: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      updatedAt: true,
    },
    orderBy: { stockCount: "asc" },
  });

  const lowStock: LowStockItem[] = [];
  for (const product of products) {
    const isProductLow = product.stockCount <= product.lowStockThreshold;
    const lowVariants: LowStockVariant[] = (product.variants || [])
      .filter((v) => v.stockCount <= product.lowStockThreshold)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        title: v.title,
        stockCount: v.stockCount,
      }));

    if (!isProductLow && lowVariants.length === 0) continue;

    lowStock.push({
      id: product.id,
      title: product.title,
      slug: product.slug,
      sku: product.sku,
      status: product.status,
      stockCount: product.stockCount,
      lowStockThreshold: product.lowStockThreshold,
      isOutOfStock: product.stockCount === 0,
      isProductLow,
      lowVariants,
      category: product.category,
      updatedAt: product.updatedAt,
    });
  }

  const total = lowStock.length;
  const items = lowStock.slice((page - 1) * limit, (page - 1) * limit + limit);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
