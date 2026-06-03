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

import type { ServerResponse } from "http";
import sharp from "sharp";

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

// ─── Public API ───────────────────────────────────────────────────────────────

/** List all image files in a shared folder link. Handles pagination. */
export async function listFolder(sharedUrl: string): Promise<DropboxFileEntry[]> {
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

/** Pipe a resized JPEG thumbnail for a file in a shared folder to the HTTP response.
 *
 * Dropbox's get_thumbnail_v2 does not support the newer scl/fo URL format, so
 * we fetch the full file via sharing/get_shared_link_file and resize it
 * server-side with sharp before sending.
 */
export async function pipeThumbnail(
  sharedUrl: string,
  filePath: string,
  res: ServerResponse
): Promise<void> {
  const token = await getAccessToken();

  const dropboxRes = await fetchSharedLinkFile(sharedUrl, filePath, token);

  if (!dropboxRes.ok) {
    const errText = await dropboxRes.text();
    console.error(`[dropbox] get_shared_link_file (thumbnail) failed (${dropboxRes.status}):`, errText);
    res.writeHead(dropboxRes.status);
    res.end();
    return;
  }

  // Stream body into a buffer, then resize with sharp
  const arrayBuffer = await dropboxRes.arrayBuffer();
  const resized = await sharp(Buffer.from(arrayBuffer))
    .resize(640, 480, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80 })
    .toBuffer();

  res.writeHead(200, {
    "Content-Type": "image/jpeg",
    "Content-Length": resized.length,
    "Cache-Control": "public, max-age=86400",
  });
  res.end(resized);
}

/** Pipe the full-size image for a file in a shared folder to the HTTP response. */
export async function pipeFile(
  sharedUrl: string,
  filePath: string,
  fileName: string,
  res: ServerResponse
): Promise<void> {
  const token = await getAccessToken();

  const dropboxRes = await fetchSharedLinkFile(sharedUrl, filePath, token);

  if (!dropboxRes.ok) {
    const errText = await dropboxRes.text();
    console.error(`[dropbox] get_shared_link_file (file) failed (${dropboxRes.status}):`, errText);
    res.writeHead(dropboxRes.status);
    res.end();
    return;
  }

  const safeFileName = fileName.replace(/[\r\n"\\]/g, "");
  res.writeHead(200, {
    "Content-Type": dropboxRes.headers.get("Content-Type") ?? "image/jpeg",
    "Content-Disposition": `attachment; filename="${safeFileName}"`,
    "Cache-Control": "public, max-age=3600",
  });

  if (dropboxRes.body) {
    const reader = dropboxRes.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } catch (err) {
      console.error("[dropbox] streaming error:", err);
    } finally {
      reader.releaseLock();
    }
  }

  res.end();
}
