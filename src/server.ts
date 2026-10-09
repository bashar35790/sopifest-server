import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { connectPrisma, prisma } from "./config/prisma";
import { connectMongoose, disconnectMongoose } from "./config/db";

const startServer = async (): Promise<void> => {
  try {
    // Connect to databases
    await connectPrisma();
    await connectMongoose();

    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      console.log(
        `🚀 Sopifest API Server listening on port ${env.PORT} [${env.NODE_ENV}]`
      );
      console.log(
        `📡 Health check available at: http://localhost:${env.PORT}/api/v1/health`
      );
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log("🔒 HTTP server closed.");
        try {
          await prisma.$disconnect();
          console.log("ℹ️ Prisma disconnected.");
          await disconnectMongoose();
          console.log("ℹ️ Mongoose disconnected.");
          process.exit(0);
        } catch (err) {
          console.error("❌ Error during graceful shutdown:", err);
          process.exit(1);
        }
      });

      // Force exit after 10s if graceful shutdown hangs
      setTimeout(() => {
        console.error("⚠️ Forcefully shutting down after timeout.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Fatal error during server startup:", error);
    process.exit(1);
  }
};

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  process.exit(1);
});

startServer();
