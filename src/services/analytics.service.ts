import { prisma } from "../config/prisma";

export interface RevenueByStatus {
  orderStatus: string;
  revenue: number;
  count: number;
}

export interface AnalyticsOverview {
  revenue: {
    total: number;
    paid: number;
    pending: number;
    byStatus: RevenueByStatus[];
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  };
  users: {
    total: number;
    active: number;
    banned: number;
    admins: number;
  };
  catalog: {
    products: number;
    published: number;
    categories: number;
    lowStock: number;
    outOfStock: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: Date;
  }>;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Admin analytics overview.
 *
 * Revenue counts non-cancelled orders (the money picture ops needs),
 * split into paid vs awaiting payment. Low-stock reuses the same
 * per-product threshold rule as the inventory service (Prisma can't
 * compare two columns in `where`).
 */
export const getAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  const [
    revenueGroups,
    orderStatusGroups,
    totalUsers,
    activeUsers,
    bannedUsers,
    adminUsers,
    totalProducts,
    publishedProducts,
    totalCategories,
    stockScan,
    recentOrders,
  ] = await Promise.all([
    prisma.order.groupBy({
      by: ["orderStatus", "paymentStatus"],
      where: { orderStatus: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["orderStatus"],
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true, isBanned: false } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.user.count({ where: { role: { in: ["ADMIN", "STAFF"] } } }),
    prisma.product.count({ where: { isDeleted: false } }),
    prisma.product.count({
      where: { isDeleted: false, status: "PUBLISHED" },
    }),
    prisma.category.count(),
    prisma.product.findMany({
      where: { isDeleted: false },
      select: { stockCount: true, lowStockThreshold: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        orderStatus: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
  ]);
  let totalRevenue = 0;
  let paidRevenue = 0;
  const byStatusMap = new Map<string, { revenue: number; count: number }>();
  for (const g of revenueGroups) {
    const sum = g._sum.total ?? 0;
    totalRevenue += sum;
    if (g.paymentStatus === "PAID") paidRevenue += sum;
    const entry = byStatusMap.get(g.orderStatus) ?? { revenue: 0, count: 0 };
    entry.revenue += sum;
    entry.count += g._count._all;
    byStatusMap.set(g.orderStatus, entry);
  }

  const orderCounts: Record<string, number> = {};
  let totalOrders = 0;
  for (const g of orderStatusGroups) {
    orderCounts[g.orderStatus] = g._count._all;
    totalOrders += g._count._all;
  }

  let lowStock = 0;
  let outOfStock = 0;
  for (const p of stockScan) {
    if (p.stockCount === 0) outOfStock += 1;
    if (p.stockCount <= p.lowStockThreshold) lowStock += 1;
  }

  return {
    revenue: {
      total: round2(totalRevenue),
      paid: round2(paidRevenue),
      pending: round2(totalRevenue - paidRevenue),
      byStatus: [...byStatusMap.entries()].map(([orderStatus, v]) => ({
        orderStatus,
        revenue: round2(v.revenue),
        count: v.count,
      })),
    },
    orders: {
      total: totalOrders,
      pending: orderCounts.PENDING ?? 0,
      processing: orderCounts.PROCESSING ?? 0,
      shipped: orderCounts.SHIPPED ?? 0,
      delivered: orderCounts.DELIVERED ?? 0,
      cancelled: orderCounts.CANCELLED ?? 0,
      refunded: orderCounts.REFUNDED ?? 0,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      banned: bannedUsers,
      admins: adminUsers,
    },
    catalog: {
      products: totalProducts,
      published: publishedProducts,
      categories: totalCategories,
      lowStock,
      outOfStock,
    },
    recentOrders,
  };
};

export interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface SalesChart {
  range: { days: number; from: string; to: string };
  points: SalesPoint[];
  totals: { revenue: number; orders: number };
}

/**
 * Sales time-series via a Mongo aggregation pipeline (aggregateRaw).
 * Buckets non-cancelled orders per calendar day (UTC) for the last N
 * days, then fills gaps so the chart is continuous.
 */
export const getSalesChart = async (days = 30): Promise<SalesChart> => {
  const safeDays = days > 0 && days <= 365 ? Math.floor(days) : 30;
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (safeDays - 1));
  from.setUTCHours(0, 0, 0, 0);

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: { $date: from.toISOString() } },
        orderStatus: { $ne: "CANCELLED" },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const raw = (await prisma.order.aggregateRaw({
    pipeline,
  })) as unknown as Array<{ _id: string; revenue: number; orders: number }>;

  const byDay = new Map(raw.map((r) => [r._id, r]));

  const points: SalesPoint[] = [];
  let totalRevenue = 0;
  let totalOrders = 0;
  const cursor = new Date(from);
  for (let i = 0; i < safeDays; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    const revenue = round2(bucket?.revenue ?? 0);
    const orders = bucket?.orders ?? 0;
    points.push({ date: key, revenue, orders });
    totalRevenue = round2(totalRevenue + revenue);
    totalOrders += orders;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    range: {
      days: safeDays,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    points,
    totals: { revenue: totalRevenue, orders: totalOrders },
  };
};
