/**
 * Vimeo URL parsing utilities — shared between API and GUI.
 */

/** Extracts the numeric video ID from any Vimeo URL format. */
export function extractVimeoId(url: string): string | null {
  const match = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Extracts the privacy hash from a Vimeo URL.
 * Handles both share URLs (`vimeo.com/123/abc`) and embed URLs (`?h=abc`).
 */
export function extractVimeoHash(url: string): string | null {
  // Query param form: ?h=abc123 (embed URLs)
  const qMatch = url.match(/[?&]h=([a-f0-9]+)/);
  if (qMatch) return qMatch[1];
  // Path form: vimeo.com/123456/abc123 (share URLs for unlisted videos)
  const pMatch = url.match(/vimeo\.com\/\d+\/([a-f0-9]+)/);
  return pMatch?.[1] ?? null;
}
