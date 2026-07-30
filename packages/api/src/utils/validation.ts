import { BadRequestError } from "../errors.js";

export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateDiscountPercent(discountPercent: number): void {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new BadRequestError("Discount percent must be between 0 and 100");
  }
}

