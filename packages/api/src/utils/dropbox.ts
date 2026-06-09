/**
 * Dropbox API v2 client.
 *
 * Uses the refresh-token flow: app key + app secret + refresh token → short-lived
 * access token cached in memory and refreshed automatically before expiry.
 *
 * Required env vars:
 *   DROPBOX_APP_KEY
 *   DROPBOX_APP_SECRET
 *   DROPBOX_REFRESH_TOKEN
 */

// ─── Token cache ──────────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number; // ms since epoch
}

let cache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cache && now < cache.expiresAt - 60_000) {
    return cache.accessToken;
  }

  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

  if (!appKey || !appSecret || !refreshToken) {
    throw new Error(
      "Dropbox credentials not configured. Set DROPBOX_APP_KEY, DROPBOX_APP_SECRET, and DROPBOX_REFRESH_TOKEN."
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dropbox token refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cache.accessToken;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DropboxFileEntry {
  ".tag": string;
  name: string;
  path_display: string;
  rev: string;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Fetch a file from a Dropbox shared folder link via the content endpoint.
 * Parameters must go in the Dropbox-API-Arg header, not the request body.
 */
async function fetchSharedLinkFile(
  sharedUrl: string,
  filePath: string,
  token: string,
): Promise<globalThis.Response> {
  return fetch("https://content.dropboxapi.com/2/sharing/get_shared_link_file", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({
        url: sharedUrl,
        path: filePath.startsWith("/") ? filePath : `/${filePath}`,
      }),
    },
  });
}

/** List all image files in a shared folder link. Handles pagination. */
async function listFolder(sharedUrl: string): Promise<DropboxFileEntry[]> {
  const token = await getAccessToken();
  const IMAGE_EXTS = /\.(jpe?g|png)$/i;
  const results: DropboxFileEntry[] = [];

  // First page
  const firstRes = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: "",
      shared_link: { url: sharedUrl },
      limit: 2000,
    }),
  });

  if (!firstRes.ok) {
    const text = await firstRes.text();
    throw new Error(`Dropbox list_folder failed (${firstRes.status}): ${text}`);
  }

  const firstData = (await firstRes.json()) as {
    entries: DropboxFileEntry[];
    has_more: boolean;
    cursor: string;
  };

  for (const entry of firstData.entries) {
    if (entry[".tag"] === "file" && IMAGE_EXTS.test(entry.name)) {
      results.push(entry);
    }
  }

  // Subsequent pages
  let hasMore = firstData.has_more;
  let cursor = firstData.cursor;

  while (hasMore) {
    const pageRes = await fetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cursor }),
    });

    if (!pageRes.ok) {
      const text = await pageRes.text();
      throw new Error(`Dropbox list_folder/continue failed (${pageRes.status}): ${text}`);
    }

    const pageData = (await pageRes.json()) as {
      entries: DropboxFileEntry[];
      has_more: boolean;
      cursor: string;
    };

    for (const entry of pageData.entries) {
      if (entry[".tag"] === "file" && IMAGE_EXTS.test(entry.name)) {
        results.push(entry);
      }
    }

    hasMore = pageData.has_more;
    cursor = pageData.cursor;
  }

  // Sort by name so the gallery order is deterministic
  results.sort((a, b) => a.name.localeCompare(b.name));

  return results;
}

// ─── Folder listing cache ─────────────────────────────────────────────────────

interface FolderCacheEntry {
  entries: DropboxFileEntry[];
  expiresAt: number;
}

const folderCache = new Map<string, FolderCacheEntry>();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all image files in a shared folder link, with a 5-minute in-memory
 * cache. Use this everywhere instead of the private `listFolder`.
 */
export async function listFolderCached(sharedUrl: string): Promise<DropboxFileEntry[]> {
  const now = Date.now();
  const cached = folderCache.get(sharedUrl);
  if (cached && now < cached.expiresAt) {
    return cached.entries;
  }
  const entries = await listFolder(sharedUrl);
  folderCache.set(sharedUrl, { entries, expiresAt: now + 5 * 60_000 });
  return entries;
}

/**
 * Download a file from a Dropbox shared folder and return its raw bytes.
 * Throws on any non-2xx Dropbox response.
 */
export async function fetchFileBuffer(sharedUrl: string, filePath: string): Promise<Buffer> {
  const token = await getAccessToken();
  const res = await fetchSharedLinkFile(sharedUrl, filePath, token);
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[dropbox] get_shared_link_file failed (${res.status}):`, errText);
    throw new Error(`Dropbox file fetch failed (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
