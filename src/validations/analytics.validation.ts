import { z } from "zod";

export const salesChartQuerySchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 30)),
  }),
});

export type SalesChartQuery = z.infer<typeof salesChartQuerySchema>["query"];
