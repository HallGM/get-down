/**
 * In-memory tracker of photo processing state per gig.
 *
 * Tracks whether a gig's delivery photos are actively being processed (either
 * background bulk generation after a Dropbox link is added, or on-demand single
 * photos triggered by guest gallery views). Also tracks counts of completed
 * photos and total photo count when known.
 *
 * Background batch generation and on-demand processing can overlap (e.g. a
 * guest views the gallery while a Dropbox link is being freshly processed), so
 * the two are tracked independently: `batchActive` for the background job,
 * `onDemandActive` as a count of in-flight on-demand requests. The gig is
 * reported as "processing" while either is active, and finishing one does not
 * clear state still owned by the other.
 *
 * Once a batch finishes, its `total`/`completed` counts are kept (with
 * `batchActive: false`) so the admin screen can show a final "all photos
 * processed" summary, until the next batch overwrites it. On-demand-only
 * sessions (no batch, so no `total`) are removed once finished since there is
 * nothing useful to report.
 *
 * State lives in the API process only. A crash or redeploy resets it to idle,
 * which is safe since photos are only considered "done" once successfully
 * uploaded to storage; any missing photos simply regenerate on next view.
 */

import type { DeliveryPhotoStatus } from "@get-down/shared";

interface GigStatus {
  batchActive: boolean;
  onDemandActive: number; // count of in-flight on-demand requests
  completed: number;      // photos processed in the current/last batch
  total?: number;         // total photos known for this gig, if set by background job
}

const statusMap = new Map<number, GigStatus>();

/**
 * Mark a gig as starting background photo generation. Sets the total photo
 * count known at the start of a batch process (e.g. all photos in a Dropbox
 * folder). Resets the completed counter to 0. Preserves any in-flight
 * on-demand count so concurrent guest requests are not lost.
 */
export function startBatchGeneration(gigId: number, totalPhotos: number): void {
  const existing = statusMap.get(gigId);
  statusMap.set(gigId, {
    batchActive: true,
    onDemandActive: existing?.onDemandActive ?? 0,
    completed: 0,
    total: totalPhotos,
  });
}

/**
 * Mark a single photo as completed during batch generation. Increments the
 * completed counter without resetting the total.
 */
export function incrementCompleted(gigId: number): void {
  const status = statusMap.get(gigId);
  if (status) {
    status.completed++;
  }
}

/**
 * Mark background batch generation as finished. Keeps the entry (with
 * `total`/`completed` intact) so the status can report a final summary,
 * unless an on-demand request is still active, in which case the gig is
 * still reported as processing until that finishes too.
 */
export function finishBatch(gigId: number): void {
  const status = statusMap.get(gigId);
  if (!status) return;
  status.batchActive = false;
}

/**
 * Mark a gig as starting on-demand photo processing (e.g. a guest viewing a
 * single photo not yet in the cache). Increments a counter of in-flight
 * on-demand requests so concurrent guests are tracked correctly, and does
 * not disturb an in-progress batch's total/completed counts.
 */
export function startOnDemandProcessing(gigId: number): void {
  const existing = statusMap.get(gigId);
  if (existing) {
    existing.onDemandActive++;
    return;
  }
  statusMap.set(gigId, {
    batchActive: false,
    onDemandActive: 1,
    completed: 0,
    // no total, since we don't know how many photos are in the gallery
  });
}

/**
 * Mark one on-demand photo request as finished. Only removes the tracked
 * entry once nothing else (batch or other on-demand requests) is active, and
 * only if there is no batch summary worth keeping (no `total`). If a batch
 * summary exists, it is left in place for the admin screen to display.
 */
export function finishOnDemandProcessing(gigId: number): void {
  const status = statusMap.get(gigId);
  if (!status) return;

  status.onDemandActive = Math.max(0, status.onDemandActive - 1);

  const nothingActive = !status.batchActive && status.onDemandActive === 0;
  if (nothingActive && status.total === undefined) {
    statusMap.delete(gigId);
  }
}

/**
 * Get the current processing status for a gig. Returns the status object,
 * or a default idle status if the gig has no pending work.
 */
export function getStatus(gigId: number): DeliveryPhotoStatus {
  const status = statusMap.get(gigId);
  if (!status) {
    return { processing: false };
  }
  return {
    processing: status.batchActive || status.onDemandActive > 0,
    ...(status.total !== undefined && { total: status.total }),
    ...(status.completed > 0 && { completed: status.completed }),
  };
}
