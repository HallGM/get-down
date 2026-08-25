export function gigUrl(gigId: number, tab?: string): string {
  const query = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  return `/gigs/${gigId}${query}`;
}
