export interface ClientFormCapabilities {
  showMealDetails: boolean;
  showMusicSection: boolean;
  showFirstDanceType: boolean;
  showBandOptions: boolean;
  showSongStep: boolean;
}

export function deriveClientFormCapabilities(flags: {
  hasBand: boolean;
  hasDj: boolean;
  requiresMeal: boolean;
}): ClientFormCapabilities {
  return {
    showMealDetails:    flags.requiresMeal,
    showMusicSection:   flags.hasDj,
    showFirstDanceType: flags.hasBand,
    showBandOptions:    flags.hasBand,
    showSongStep:       flags.hasBand,
  };
}
