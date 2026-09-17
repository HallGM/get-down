import { deriveClientFormCapabilities as deriveRawCapabilities, type ClientFormCapabilities as RawClientFormCapabilities } from "@get-down/shared";

export interface ClientFormCapabilities {
  showMealDetails: boolean;
  showMusicSection: boolean;
  showFirstDanceType: boolean;
  showBandOptions: boolean;
  showSongStep: boolean;
  showCeremonyMusic: boolean;
  showEveningEntertainment: boolean;
  showBagpipes: boolean;
  showVideography: boolean;
  showGettingReady: boolean;
}

export type ClientFormCapabilityInput = RawClientFormCapabilities;

export function deriveClientFormCapabilities(flags: ClientFormCapabilityInput): ClientFormCapabilities {
  const capabilities = deriveRawCapabilities(flags);
  return {
    showMealDetails: flags.requiresMeal,
    showMusicSection: flags.hasMusicCapability,
    showFirstDanceType: flags.hasBand,
    showBandOptions: flags.hasBand,
    showSongStep: flags.hasBand,
    showCeremonyMusic: flags.ceremonyMusic,
    showEveningEntertainment: capabilities.eveningEntertainment,
    showBagpipes: flags.bagpipes,
    showVideography: flags.videography,
    showGettingReady: flags.gettingReady,
  };
}
