import type { DeliveryPageResponse, DeliveryPhoto } from "@get-down/shared";
import { extractVimeoId } from "@get-down/shared";
import sharp from "sharp";
import * as gigsRepo from "../repository/gigs.js";
import * as videosRepo from "../repository/gig_delivery_videos.js";
import { mapVideo } from "./deliveryVideos.js";
import { NotFoundError, BadRequestError } from "../errors.js";
import * as dropbox from "../utils/dropbox.js";
import * as storage from "../utils/storage.js";
import * as vimeo from "../utils/vimeo.js";
import { semaphore, r2Key, VARIANTS, type VariantName, fireGenerateDeliveryPhotos } from "../jobs/generateDeliveryPhotos.js";

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getDeliveryPage(token: string): Promise<DeliveryPageResponse> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig) throw new NotFoundError("Delivery page not found");

  const dateStr =
    typeof gig.date === "string" ? gig.date : new Date(gig.date).toISOString().slice(0, 10);

  const videoRows = await videosRepo.readVideosByGigId(gig.id);
  const videos = videoRows.map(mapVideo);

  return {
    firstName: gig.first_name,
    lastName: gig.last_name,
    partnerName: gig.partner_name ?? undefined,
    date: dateStr,
    venueName: gig.venue_name ?? undefined,
    videos,
    dropboxUrl: gig.dropbox_url ?? undefined,
    deliveryTitle: gig.delivery_title ?? undefined,
  };
}

export async function listPhotos(token: string): Promise<{ photos: DeliveryPhoto[] }> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig) throw new NotFoundError("Delivery page not found");
  if (!gig.dropbox_url) return { photos: [] };

  const entries = await dropbox.listFolderCached(gig.dropbox_url);
  return { photos: entries.map((e) => ({ name: e.name })) };
}

export const getThumbnailUrl = (token: string, name: string): Promise<string> =>
  getVariantUrl(token, name, "thumbnails");

export const getDisplayUrl = (token: string, name: string): Promise<string> =>
  getVariantUrl(token, name, "display");

/**
 * Deletes all cached R2 images for the gig and fires a background regeneration
 * job. Returns immediately — the job runs in the background.
 */
export async function refreshThumbnails(gigId: number): Promise<void> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");
  if (!gig.dropbox_url) throw new BadRequestError("Gig has no Dropbox URL configured");

  await Promise.all([
    storage.deletePrefix(`thumbnails/${gigId}/`),
    storage.deletePrefix(`display/${gigId}/`),
  ]);

  fireGenerateDeliveryPhotos(gigId, gig.dropbox_url);
}

export async function getVideoDownloadUrl(
  token: string,
  videoId: number
): Promise<{ url: string | null }> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig) throw new NotFoundError("Delivery page not found");

  const video = await videosRepo.readVideoById(videoId);
  if (!video || video.gig_id !== gig.id) return { url: null };

  const vimeoId = extractVimeoId(video.vimeo_url);
  if (!vimeoId) return { url: null };

  const url = await vimeo.getDownloadUrl(vimeoId);
  return { url };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Returns a presigned R2 URL for the requested image variant of the named photo.
 * Lazily generates and uploads to R2 on a cache miss, gated by the shared semaphore.
 */
async function getVariantUrl(token: string, name: string, variant: VariantName): Promise<string> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig || !gig.dropbox_url) throw new NotFoundError("Photo not found");

  const entries = await dropbox.listFolderCached(gig.dropbox_url);
  const entry = entries.find((e) => e.name === name);
  if (!entry) throw new NotFoundError("Photo not found");

  const key = r2Key(variant, gig.id, entry.rev, entry.name);
  const exists = await storage.headFile(key);
  if (!exists) {
    const { width, height, quality } = VARIANTS[variant];
    await semaphore.acquire();
    try {
      const buffer = await dropbox.fetchFileBuffer(gig.dropbox_url, `/${entry.name}`);
      const out = await sharp(buffer)
        .resize(width, height, { fit: "cover", position: "centre" })
        .jpeg({ quality })
        .toBuffer();
      await storage.uploadFile(key, out, "image/jpeg");
    } finally {
      semaphore.release();
    }
  }

  return storage.getPresignedUrl(key, 86400);
}
