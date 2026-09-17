import type { ClientFormCapabilities, ServiceGroup } from "./models.js";

export const SERVICE_GROUP_NAMES = {
  CEREMONY_MUSIC: "Ceremony music",
  EVENING_ENTERTAINMENT: "Evening entertainment",
  BAGPIPES: "Bagpipes",
  VIDEOGRAPHY: "Videography",
  GETTING_READY: "Getting ready",
  BAND: "Band",
  DJ_ONLY: "DJ only",
  REQUIRES_MEAL: "Requires meal",
} as const;

export function deriveClientFormCapabilities(flags: ClientFormCapabilities): ClientFormCapabilities {
  return {
    ...flags,
    eveningEntertainment: flags.eveningEntertainment || flags.hasBand || flags.hasMusicCapability,
  };
}

export function serviceHasGroup(service: { groups: ServiceGroup[] }, groupName: string): boolean {
  return service.groups.some((group) => group.name === groupName);
}

export function isBandService(service: { groups: ServiceGroup[] }): boolean {
  return serviceHasGroup(service, SERVICE_GROUP_NAMES.BAND);
}
