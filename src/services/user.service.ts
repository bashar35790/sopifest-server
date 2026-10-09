import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { CartSyncInput } from "../validations/user.validation";

const wishlistProductSelect = {
  id: true,
  title: true,
  slug: true,
  brand: true,
  basePrice: true,
  discountPrice: true,
  images: true,
  stockCount: true,
  rating: true,
  numReviews: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

export const getWishlist = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { wishlistProductIds: true },
  });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (user.wishlistProductIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: user.wishlistProductIds }, isDeleted: false },
    select: wishlistProductSelect,
  });

  // Silently prune stale ids (deleted products) so the cloud list stays clean.
  const foundIds = new Set(products.map((p) => p.id));
  if (foundIds.size !== user.wishlistProductIds.length) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        wishlistProductIds: user.wishlistProductIds.filter((id) =>
          foundIds.has(id)
        ),
      },
    });
  }

  // Preserve the order in which items were wishlisted.
  const order = new Map(user.wishlistProductIds.map((id, i) => [id, i]));
  return products.sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );
};

export const toggleWishlist = async (userId: string, productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, isDeleted: false },
    select: { id: true },
  });
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { wishlistProductIds: true },
  });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const has = user.wishlistProductIds.includes(productId);
  const wishlistProductIds = has
    ? user.wishlistProductIds.filter((id) => id !== productId)
    : [...user.wishlistProductIds, productId];

  await prisma.user.update({
    where: { id: userId },
    data: { wishlistProductIds },
  });

  return {
    productId,
    wishlisted: !has,
    wishlistCount: wishlistProductIds.length,
  };
};

export interface SyncedCartItem {
  productId: string;
  variantId?: string;
  title: string;
  sku: string;
  image: string | null;
  attributes?: Record<string, any> | null;
  unitPrice: number;
  requestedQuantity: number;
  availableQuantity: number;
  inStock: boolean;
  valid: boolean;
  message?: string;
}

// Stateless reconcile: the frontend sends its local (guest) cart and gets
// back authoritative prices, stock caps, and validity flags. Invalid items
// (deleted/unpublished/unknown variant) are flagged, never priced.
export const syncCart = async (input: CartSyncInput) => {
  const items: SyncedCartItem[] = [];

  for (const entry of input.items) {
    const base = {
      productId: entry.productId,
      variantId: entry.variantId,
      requestedQuantity: entry.quantity,
    };

    const product = await prisma.product.findFirst({
      where: { id: entry.productId, isDeleted: false },
    });

    if (!product) {
      items.push({
        ...base,
        title: "Unavailable product",
        sku: "",
        image: null,
        unitPrice: 0,
        availableQuantity: 0,
        inStock: false,
        valid: false,
        message: "Product not found or no longer available",
      });
      continue;
    }

    if (product.status !== "PUBLISHED") {
      items.push({
        ...base,
        title: product.title,
        sku: product.sku,
        image: product.images?.[0]?.url ?? null,
        unitPrice: 0,
        availableQuantity: 0,
        inStock: false,
        valid: false,
        message: `Product is currently ${product.status.toLowerCase().replace(/_/g, " ")}`,
      });
      continue;
    }

    if (entry.variantId) {
      const variant = (product.variants || []).find(
        (v) => v.id === entry.variantId
      );
      if (!variant) {
        items.push({
          ...base,
          title: product.title,
          sku: product.sku,
          image: product.images?.[0]?.url ?? null,
          unitPrice: 0,
          availableQuantity: 0,
          inStock: false,
          valid: false,
          message: "Selected variant no longer exists",
        });
        continue;
      }

      const unitPrice = variant.discountPrice ?? variant.price;
      const availableQuantity = Math.max(
        0,
        Math.min(entry.quantity, variant.stockCount)
      );
      items.push({
        ...base,
        title: `${product.title} (${variant.title})`,
        sku: variant.sku,
        image:
          variant.image ??
          product.images?.find((img) => img.isPrimary)?.url ??
          product.images?.[0]?.url ??
          null,
        attributes: variant.attributes as Record<string, any>,
        unitPrice,
        availableQuantity,
        inStock: variant.stockCount > 0,
        valid: true,
      });
      continue;
    }

    const unitPrice = product.discountPrice ?? product.basePrice;
    const availableQuantity = Math.max(
      0,
      Math.min(entry.quantity, product.stockCount)
    );
    items.push({
      ...base,
      title: product.title,
      sku: product.sku,
      image:
        product.images?.find((img) => img.isPrimary)?.url ??
        product.images?.[0]?.url ??
        null,
      unitPrice,
      availableQuantity,
      inStock: product.stockCount > 0,
      valid: true,
    });
  }

  const validItems = items.filter((i) => i.valid && i.availableQuantity > 0);
  return {
    items,
    summary: {
      validItemCount: validItems.length,
      totalQuantity: validItems.reduce((sum, i) => sum + i.availableQuantity, 0),
      subtotal: validItems.reduce(
        (sum, i) => sum + i.unitPrice * i.availableQuantity,
        0
      ),
    },
  };
};
