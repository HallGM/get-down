import type { Person, Gig } from "@get-down/shared";

export function formatPersonName(p: Person): string {
  return p.displayName ?? `${p.firstName}${p.lastName ? ` ${p.lastName}` : ""}`;
}

export function formatGigName(gig: Pick<Gig, "firstName" | "lastName">): string {
  return `${gig.firstName}${gig.lastName ? ` ${gig.lastName}` : ""}`.trim();
}
