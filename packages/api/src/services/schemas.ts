import { z } from "zod";

export const ExpenseLinkApportionmentSchema = z.object({
  apportionedAmount: z.number().int().positive().nullable(),
});
