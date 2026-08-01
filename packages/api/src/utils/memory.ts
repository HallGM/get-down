/**
 * Safe threshold for RSS memory usage. Render's 512 MB instance limit means we
 * want to stay well below that. Tests showed ~450 MB peak before the crash.
 * Aim for 350 MB so there's headroom before actual OOM pressure.
 *
 * RSS (not heap) is used because it maps directly to the physical memory
 * enforced by Render's cgroup limit. Heap/external figures are logged
 * alongside RSS (see memMB()) to help diagnose whether growth is coming from
 * JS objects or native buffers, but the go/no-go throttle decision is RSS-based
 * since that's what actually triggers an OOM kill.
 */
export const RSS_SAFE_THRESHOLD_MB = 350;

/**
 * Maximum time to wait for memory to drop back to a safe level before giving
 * up. Node's allocator does not always return freed pages to the OS promptly,
 * so RSS can stay elevated even after buffers have been released. Without a
 * cap, a persistently high RSS reading would stall photo processing forever.
 * Callers decide how to react if the wait times out (see return value below).
 */
const MAX_THROTTLE_WAIT_MS = 30_000;
const THROTTLE_POLL_INTERVAL_MS = 1000;

/**
 * Checks current RSS and, if it exceeds the safe threshold, waits (polling
 * every second) for it to drop back down, up to a maximum wait time.
 *
 * Returns `true` if memory is at or under the safe threshold (either it
 * already was, or it dropped back down during the wait), or `false` if the
 * maximum wait elapsed while memory was still over threshold. Callers must
 * decide how to react to `false` — e.g. proceed anyway with a warning for a
 * fire-and-forget background job, or fail the request for an on-demand path
 * so as not to add more load during sustained pressure.
 *
 * `context` is a short label included in log lines to identify which caller
 * (gig/photo) triggered the throttle, for easier debugging in production logs.
 */
export async function throttleIfMemoryHigh(context: string): Promise<boolean> {
  const rssMB = () => process.memoryUsage().rss / 1024 / 1024;

  let current = rssMB();
  if (current <= RSS_SAFE_THRESHOLD_MB) return true;

  console.warn(
    `[memory-throttle] ${context} RSS ${current.toFixed(1)} MB exceeds safe threshold ${RSS_SAFE_THRESHOLD_MB} MB, pausing`
  );

  const deadline = Date.now() + MAX_THROTTLE_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, THROTTLE_POLL_INTERVAL_MS));
    current = rssMB();
    if (current <= RSS_SAFE_THRESHOLD_MB) {
      console.info(
        `[memory-throttle] ${context} RSS ${current.toFixed(1)} MB is back to safe level, resuming`
      );
      return true;
    }
  }

  console.warn(
    `[memory-throttle] ${context} RSS still ${current.toFixed(1)} MB after ${MAX_THROTTLE_WAIT_MS / 1000}s wait, giving up`
  );
  return false;
}

/** Returns a compact memory snapshot string. `ext` = libvips / native buffers. */
export function memMB(): string {
  const { rss, heapUsed, heapTotal, external } = process.memoryUsage();
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1);
  return `rss=${mb(rss)} heap=${mb(heapUsed)}/${mb(heapTotal)} ext=${mb(external)}`;
}
