/**
 * Check if a song is excluded for the given booked band-size service IDs.
 * A song is excluded if its excludedServiceIds intersect with bookedBandServiceIds.
 */
export function isSongExcludedForBandSizes(
  excludedServiceIds: number[] | undefined,
  bookedBandServiceIds: Set<number>
): boolean {
  if (!excludedServiceIds || excludedServiceIds.length === 0) {
    return false;
  }
  return excludedServiceIds.some(id => bookedBandServiceIds.has(id));
}
