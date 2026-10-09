import { z } from "zod";

export const getLowStockQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
  }),
});

export type LowStockQuery = z.infer<typeof getLowStockQuerySchema>["query"];
