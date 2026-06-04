import { run_query, withTransaction } from "../db/init.js";

export interface GigDeliveryVideoRow {
  id: number;
  gig_id: number;
  title: string;
  vimeo_url: string;
  position: number;
}

export async function readVideosByGigId(gigId: number): Promise<GigDeliveryVideoRow[]> {
  return run_query<GigDeliveryVideoRow>({
    text: "SELECT id, gig_id, title, vimeo_url, position FROM gig_delivery_videos WHERE gig_id = $1 ORDER BY position ASC",
    values: [gigId],
  });
}

export async function readVideoById(id: number): Promise<GigDeliveryVideoRow | null> {
  const rows = await run_query<GigDeliveryVideoRow>({
    text: "SELECT id, gig_id, title, vimeo_url, position FROM gig_delivery_videos WHERE id = $1",
    values: [id],
  });
  return rows[0] ?? null;
}

export async function createVideo(
  gigId: number,
  title: string,
  vimeoUrl: string,
  position: number
): Promise<GigDeliveryVideoRow> {
  const rows = await run_query<GigDeliveryVideoRow>({
    text: "INSERT INTO gig_delivery_videos (gig_id, title, vimeo_url, position) VALUES ($1, $2, $3, $4) RETURNING id, gig_id, title, vimeo_url, position",
    values: [gigId, title, vimeoUrl, position],
  });
  return rows[0];
}

export async function updateVideo(
  id: number,
  gigId: number,
  title: string,
  vimeoUrl: string
): Promise<GigDeliveryVideoRow | null> {
  const rows = await run_query<GigDeliveryVideoRow>({
    text: "UPDATE gig_delivery_videos SET title = $1, vimeo_url = $2 WHERE id = $3 AND gig_id = $4 RETURNING id, gig_id, title, vimeo_url, position",
    values: [title, vimeoUrl, id, gigId],
  });
  return rows[0] ?? null;
}

export async function deleteVideo(id: number, gigId: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: "DELETE FROM gig_delivery_videos WHERE id = $1 AND gig_id = $2 RETURNING id",
    values: [id, gigId],
  });
  return rows.length > 0;
}

export async function countVideosByGigId(gigId: number): Promise<number> {
  const rows = await run_query<{ count: string }>({
    text: "SELECT COUNT(*) AS count FROM gig_delivery_videos WHERE gig_id = $1",
    values: [gigId],
  });
  return parseInt(rows[0].count, 10);
}

export async function reorderVideos(gigId: number, orderedIds: number[]): Promise<void> {
  await withTransaction(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await run_query({
        text: "UPDATE gig_delivery_videos SET position = $1 WHERE id = $2 AND gig_id = $3",
        values: [i, orderedIds[i], gigId],
      });
    }
  });
}
