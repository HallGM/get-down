/**
 * Service type definitions and constants
 */

export const SERVICE_NAMES = {
  LIVE_BAND: "Live Band (3/5/7 piece)",
  WEDDING_FILM: "Wedding Film",
  PHOTOGRAPHY: "Photography",
  SINGING_WAITER: "Singing Waiting",
  BAGPIPES: "Bagpipes",
  ACOUSTIC_DUO: "Acoustic Duo",
  KARAOKE_BANDEOKE: "Karaoke/Bandeoke",
  SAXOPHONE_SOLO: "Saxophone Solo",
  DJ: "DJ",
  CEILIDH: "Ceilidh",
} as const;

export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];

export interface ServiceCategory {
  name: ServiceName;
  category: "music" | "video" | "photo" | "entertainment";
}
