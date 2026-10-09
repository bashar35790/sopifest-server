import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
      message: "PORT must be a valid port number between 1 and 65535",
    }),
  DATABASE_URL: z.string().min(1, {
    message: "DATABASE_URL is required (e.g. mongodb://localhost:27017/sopifest)",
  }),
  JWT_ACCESS_SECRET: z.string().min(16, {
    message: "JWT_ACCESS_SECRET must be at least 16 characters long",
  }),
  JWT_REFRESH_SECRET: z.string().min(16, {
    message: "JWT_REFRESH_SECRET must be at least 16 characters long",
  }),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // Stripe online payments (optional until keys are provisioned).
  // create-intent runs in mock mode when STRIPE_SECRET_KEY is absent,
  // so checkout UI (Task 36) can be built/tested without live keys.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CURRENCY: z.string().default("usd"),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment configuration:");
    result.error.issues.forEach((issue) => {
      console.error(` - ${issue.path.join(".")}: ${issue.message}`);
    });
    throw new Error("Invalid environment configuration. Check your .env file.");
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
