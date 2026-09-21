export const FIRST_DANCE_TYPES = ["", "Live", "DJ", "None"] as const;
export const CEILIDH_LENGTHS = ["", "30 mins", "1 hour"] as const;
export const CEILIDH_STYLES = ["", "Mash-up", "Traditional"] as const;
export const STATUS_OPTIONS = ["draft", "enquiry", "confirmed", "completed", "cancelled", "postponed"] as const;

export function isLegacyOption(
  options: readonly string[],
  currentValue: string | undefined,
): currentValue is string {
  return currentValue !== undefined && currentValue !== "" && !options.includes(currentValue);
}

export function optionsWithLegacyValue(
  options: readonly string[],
  currentValue: string | undefined,
): string[] {
  if (isLegacyOption(options, currentValue)) {
    return [...options, currentValue];
  }
  return [...options];
}

export function optionLabel(value: string): string {
  return value || "Please select";
}
