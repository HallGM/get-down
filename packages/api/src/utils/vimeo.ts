/**
 * Vimeo API helpers.
 *
 * Required env var: VIMEO_ACCESS_TOKEN (personal access token, video:read scope)
 */

interface VimeoDownloadLink {
  quality: string;
  type: string;
  width: number;
  height: number;
  link: string;
  size: number;
}

/**
 * Returns the direct download URL for the highest-quality version of a Vimeo
 * video. The video must have downloads enabled in its Vimeo settings.
 */
export async function getDownloadUrl(videoId: string): Promise<string | null> {
  const token = process.env.VIMEO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("VIMEO_ACCESS_TOKEN is not set.");
  }

  const res = await fetch(`https://api.vimeo.com/videos/${videoId}?fields=download`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[vimeo] failed to fetch video ${videoId} (${res.status}):`, text);
    return null;
  }

  const data = (await res.json()) as { download?: VimeoDownloadLink[] };

  if (!data.download || data.download.length === 0) {
    return null;
  }

  // Pick the highest resolution available
  const sorted = [...data.download].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
  return sorted[0].link;
}
