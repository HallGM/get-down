import type { PersonRow } from "../repository/people.js";
import { resolvePersonName } from "@get-down/shared";

/** Converts a PersonRow's snake_case fields into the shape expected by resolvePersonName. */
export function personRowToNameInput(person: PersonRow) {
  return {
    businessName: person.business_name ?? undefined,
    displayName: person.display_name ?? undefined,
    firstName: person.first_name ?? undefined,
    lastName: person.last_name ?? undefined,
  };
}

/** Resolves a display name for a person, preferring business name, then display name, then first/last name. */
export function resolvePersonRowName(person: PersonRow): string {
  return resolvePersonName(personRowToNameInput(person));
}
