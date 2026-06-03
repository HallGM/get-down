import type { DeliveryPageResponse, DeliveryPhoto } from "@get-down/shared";
import { extractVimeoId } from "@get-down/shared";
import type { ServerResponse } from "http";
import type { Response } from "express";
import * as gigsRepo from "../repository/gigs.js";
import { NotFoundError } from "../errors.js";
import * as dropbox from "../utils/dropbox.js";
import * as vimeo from "../utils/vimeo.js";

/** Looks up a gig by token and returns its dropbox_url, or sends 404 and returns null. */
async function resolveDropboxUrl(token: string, res: Response): Promise<string | null> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig || !gig.dropbox_url) {
    res.status(404).end();
    return null;
  }
  return gig.dropbox_url;
}

export async function getDeliveryPage(token: string): Promise<DeliveryPageResponse> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig) throw new NotFoundError("Delivery page not found");

  const dateStr =
    typeof gig.date === "string" ? gig.date : new Date(gig.date).toISOString().slice(0, 10);

  return {
    firstName: gig.first_name,
    lastName: gig.last_name,
    partnerName: gig.partner_name ?? undefined,
    date: dateStr,
    venueName: gig.venue_name ?? undefined,
    vimeoUrl: gig.vimeo_url ?? undefined,
    dropboxUrl: gig.dropbox_url ?? undefined,
    deliveryTitle: gig.delivery_title ?? undefined,
  };
}

export async function listPhotos(token: string): Promise<{ photos: DeliveryPhoto[] }> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig) throw new NotFoundError("Delivery page not found");
  if (!gig.dropbox_url) return { photos: [] };

  const entries = await dropbox.listFolder(gig.dropbox_url);
  return { photos: entries.map((e) => ({ name: e.name })) };
}

export async function proxyThumbnail(
  token: string,
  name: string,
  res: Response
): Promise<void> {
  const dropboxUrl = await resolveDropboxUrl(token, res);
  if (!dropboxUrl) return;
  await dropbox.pipeThumbnail(dropboxUrl, `/${name}`, res as unknown as ServerResponse);
}

export async function proxyFile(
  token: string,
  name: string,
  res: Response
): Promise<void> {
  const dropboxUrl = await resolveDropboxUrl(token, res);
  if (!dropboxUrl) return;
  await dropbox.pipeFile(dropboxUrl, `/${name}`, name, res as unknown as ServerResponse);
}

export async function getVideoDownloadUrl(token: string): Promise<{ url: string | null }> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig) throw new NotFoundError("Delivery page not found");
  if (!gig.vimeo_url) return { url: null };

  const videoId = extractVimeoId(gig.vimeo_url);
  if (!videoId) return { url: null };

  const url = await vimeo.getDownloadUrl(videoId);
  return { url };
}
