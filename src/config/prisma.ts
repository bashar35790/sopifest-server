import { PrismaClient } from "@prisma/client";
import { env } from "./env";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export const connectPrisma = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("✅ Prisma successfully connected to MongoDB.");
  } catch (error) {
    console.error("❌ Prisma MongoDB connection failed:", error);
    process.exit(1);
  }
};
