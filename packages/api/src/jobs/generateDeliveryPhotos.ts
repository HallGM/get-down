import sharp from "sharp";
import * as dropbox from "../utils/dropbox.js";
import { headFile, uploadFile } from "../utils/storage.js";

// ─── Concurrency semaphore ─────────────────────────────────────────────────────

class Semaphore {
  private slots: number;
  private queue: Array<() => void> = [];

  constructor(slots: number) {
    this.slots = slots;
  }

  acquire(): Promise<void> {
    if (this.slots > 0) {
      this.slots--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      resolve();
    } else {
      this.slots++;
    }
  }

  /** Number of slots currently free. */
  get available(): number { return this.slots; }

  /** Number of callers waiting for a slot. */
  get queued(): number { return this.queue.length; }
}

/**
 * Shared 4-slot semaphore used by both background generation and on-demand
 * delivery. Bounding simultaneous full-resolution downloads and sharp
 * operations prevents OOM on constrained hosts.
 */
export const semaphore = new Semaphore(4);

// ─── Key helpers ───────────────────────────────────────────────────────────────

export function r2Key(prefix: string, gigId: number, rev: string, filename: string): string {
  return `${prefix}/${gigId}/${rev}-${encodeURIComponent(filename)}`;
}

// ─── Variant specs ─────────────────────────────────────────────────────────────

export const VARIANTS = {
  thumbnails: { width: 640, height: 480, quality: 80 },
  display:    { width: 1920, height: 1280, quality: 88 },
} as const;

export type VariantName = keyof typeof VARIANTS;

// ─── Debug helpers ─────────────────────────────────────────────────────────────

/** Returns a compact memory snapshot string. `ext` = libvips / native buffers. */
export function memMB(): string {
  const { rss, heapUsed, heapTotal, external } = process.memoryUsage();
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1);
  return `rss=${mb(rss)} heap=${mb(heapUsed)}/${mb(heapTotal)} ext=${mb(external)}`;
}

function semState(): string {
  return `sem=${semaphore.available} avail / ${semaphore.queued} waiting`;
}

// ─── Background job ────────────────────────────────────────────────────────────

/**
 * Generates thumbnail (640×480) and display (1920×1280) JPEG images for every
 * photo in the given Dropbox shared folder and uploads them to R2.
 *
 * Fire-and-forget: never await this function. Errors are caught per-file so a
 * single bad image does not abort the whole run.
 */
export async function generateDeliveryPhotos(gigId: number, dropboxUrl: string): Promise<void> {
  const entries = await dropbox.listFolderCached(dropboxUrl);
  const total = entries.length;
  console.info(`[generate] gig=${gigId} total=${total} | ${memMB()}`);

  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const n = i + 1;
    const tag = `[generate] [${n}/${total}] ${entry.name}`;

    console.info(`${tag} pre-acquire | ${semState()} | ${memMB()}`);
    await semaphore.acquire();
    console.info(`${tag} acquired | ${semState()} | ${memMB()}`);

    try {
      const thumbKey   = r2Key("thumbnails", gigId, entry.rev, entry.name);
      const displayKey = r2Key("display",    gigId, entry.rev, entry.name);

      const [thumbExists, displayExists] = await Promise.all([
        headFile(thumbKey),
        headFile(displayKey),
      ]);

      console.info(`${tag} r2 check: thumb=${thumbExists} display=${displayExists}`);

      if (thumbExists && displayExists) {
        skipped++;
        console.info(`${tag} skip (both cached) total_skipped=${skipped}`);
        continue;
      }

      console.info(`${tag} downloading | ${memMB()}`);
      const buffer = await dropbox.fetchFileBuffer(dropboxUrl, `/${entry.name}`);
      console.info(`${tag} downloaded ${(buffer.length / 1024 / 1024).toFixed(2)}MB | ${memMB()}`);

      if (!thumbExists) {
        console.info(`${tag} sharp:thumbnail start | ${memMB()}`);
        const thumbBuffer = await sharp(buffer)
          .resize(VARIANTS.thumbnails.width, VARIANTS.thumbnails.height, { fit: "cover", position: "centre" })
          .jpeg({ quality: VARIANTS.thumbnails.quality })
          .toBuffer();
        console.info(`${tag} sharp:thumbnail done output=${(thumbBuffer.length / 1024).toFixed(0)}KB | ${memMB()}`);
        await uploadFile(thumbKey, thumbBuffer, "image/jpeg");
        console.info(`${tag} uploaded thumbnail`);
      }

      if (!displayExists) {
        console.info(`${tag} sharp:display start | ${memMB()}`);
        const displayBuffer = await sharp(buffer)
          .resize(VARIANTS.display.width, VARIANTS.display.height, { fit: "cover", position: "centre" })
          .jpeg({ quality: VARIANTS.display.quality })
          .toBuffer();
        console.info(`${tag} sharp:display done output=${(displayBuffer.length / 1024).toFixed(0)}KB | ${memMB()}`);
        await uploadFile(displayKey, displayBuffer, "image/jpeg");
        console.info(`${tag} uploaded display`);
      }
    } catch (err) {
      console.error(`${tag} ERROR | ${memMB()}`, err);
    } finally {
      semaphore.release();
      console.info(`${tag} released | ${semState()} | ${memMB()}`);
    }
  }

  console.info(`[generate] gig=${gigId} complete skipped=${skipped} | ${memMB()}`);
}

/**
 * Fire-and-forget wrapper. Logs errors but does not propagate them.
 * Use this everywhere `generateDeliveryPhotos` is kicked off in the background.
 */
export function fireGenerateDeliveryPhotos(gigId: number, dropboxUrl: string): void {
  generateDeliveryPhotos(gigId, dropboxUrl).catch((err) =>
    console.error("[generate]", err)
  );
}
