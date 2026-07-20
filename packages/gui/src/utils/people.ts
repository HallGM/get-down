import type { Person, Gig } from "@get-down/shared";

export function formatPersonName(p: Person): string {
  return p.displayName ?? `${p.firstName}${p.lastName ? ` ${p.lastName}` : ""}`;
}

export function formatGigName(gig: Pick<Gig, "firstName" | "lastName">): string {
  return `${gig.firstName}${gig.lastName ? ` ${gig.lastName}` : ""}`.trim();
}

/** Safely resolve a person's display name from a list. Returns empty string if not found. */
export function resolvePersonName(people: Person[], personId: number | undefined): string {
  if (!personId) return "";
  const person = people.find((p) => p.id === personId);
  return person ? formatPersonName(person) : "";
}

/** Format a showcase's display name using its nickname, fullName, or ID fallback. */
export function formatShowcaseName(showcase: { nickname?: string | null; fullName?: string | null }, showcaseId: number): string {
  return showcase.nickname ?? showcase.fullName ?? `Showcase #${showcaseId}`;
}

/** Format a location for display: prefer venue name, fall back to location text, then placeholder. */
export function formatLocation(venueName?: string | null, location?: string | null): string {
  return venueName ?? location ?? "—";
}
