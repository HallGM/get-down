import { z } from "zod";
import { BadRequestError } from "../errors.js";

export function parseOrBadRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((e) => e.message).join(", ");
    throw new BadRequestError(message);
  }
  return result.data;
}
