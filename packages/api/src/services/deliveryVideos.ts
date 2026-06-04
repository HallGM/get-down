import type { DeliveryVideo, CreateDeliveryVideoRequest, UpdateDeliveryVideoRequest } from "@get-down/shared";
import * as repo from "../repository/gig_delivery_videos.js";
import * as gigsRepo from "../repository/gigs.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { isValidUrl } from "../utils/validation.js";

export function mapVideo(row: repo.GigDeliveryVideoRow): DeliveryVideo {
  return {
    id: row.id,
    title: row.title,
    vimeoUrl: row.vimeo_url,
    position: row.position,
  };
}

export async function getVideos(gigId: number): Promise<DeliveryVideo[]> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");
  const rows = await repo.readVideosByGigId(gigId);
  return rows.map(mapVideo);
}

export async function createVideo(
  gigId: number,
  body: CreateDeliveryVideoRequest
): Promise<DeliveryVideo> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");

  const title = body.title?.trim();
  if (!title) throw new BadRequestError("title is required");
  const vimeoUrl = body.vimeoUrl?.trim();
  if (!vimeoUrl) throw new BadRequestError("vimeoUrl is required");
  if (!isValidUrl(vimeoUrl)) throw new BadRequestError("vimeoUrl must be a valid URL");

  const count = await repo.countVideosByGigId(gigId);
  const row = await repo.createVideo(gigId, title, vimeoUrl, count);
  return mapVideo(row);
}

export async function updateVideo(
  gigId: number,
  videoId: number,
  body: UpdateDeliveryVideoRequest
): Promise<DeliveryVideo> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");

  const existing = await repo.readVideoById(videoId);
  if (!existing || existing.gig_id !== gigId) throw new NotFoundError("Video not found");

  const title = body.title?.trim() ?? existing.title;
  const vimeoUrl = body.vimeoUrl?.trim() ?? existing.vimeo_url;
  if (!title) throw new BadRequestError("title is required");
  if (!isValidUrl(vimeoUrl)) throw new BadRequestError("vimeoUrl must be a valid URL");

  const row = await repo.updateVideo(videoId, gigId, title, vimeoUrl);
  if (!row) throw new NotFoundError("Video not found");
  return mapVideo(row);
}

export async function deleteVideo(gigId: number, videoId: number): Promise<void> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");
  const deleted = await repo.deleteVideo(videoId, gigId);
  if (!deleted) throw new NotFoundError("Video not found");
}

export async function reorderVideos(gigId: number, orderedIds: number[]): Promise<void> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "number")) {
    throw new BadRequestError("orderedIds must be an array of numbers");
  }
  await repo.reorderVideos(gigId, orderedIds);
}
