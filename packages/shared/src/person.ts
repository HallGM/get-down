/**
 * Utility functions for Person model operations.
 */

import type { Person } from "./models.js";

/**
 * Resolve person's display name in order of preference:
 * 1. businessName (if set)
 * 2. displayName (if set)
 * 3. firstName + lastName joined (if available)
 * 4. firstName only
 * 5. fallback to "Unknown"
 */
export function resolvePersonName(person: Partial<Pick<Person, "businessName" | "displayName" | "firstName" | "lastName">>): string {
  if (person.businessName) return person.businessName;
  if (person.displayName) return person.displayName;
  const names = [person.firstName, person.lastName].filter(Boolean);
  return names.length > 0 ? names.join(" ") : "Unknown";
}
