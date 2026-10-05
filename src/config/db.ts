import mongoose from "mongoose";
import { env } from "./env";

export const connectMongoose = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(env.DATABASE_URL);
    console.log(
      `✅ Mongoose successfully connected to MongoDB host: ${conn.connection.host}`
    );
    return conn;
  } catch (error) {
    console.error("❌ Mongoose MongoDB connection failed:", error);
    throw error;
  }
};

export const disconnectMongoose = async (): Promise<void> => {
  await mongoose.disconnect();
  console.log("ℹ️ Mongoose disconnected.");
};
