// Keeps the pose model files in the browser's Cache Storage, so each one downloads once and not again
// on later visits. Google serves the models with only a 1-hour browser cache (max-age=3600), so
// without this the 30 MB Heavy model is downloaded again on most visits. Where Cache Storage is
// missing (old browsers, some private windows) it is a plain download.

const CACHE_NAME = 'rhymnast-pose-models-v1';

/** Downloads in progress, so a preload and a camera start share one download. */
const inFlight = new Map<string, Promise<Uint8Array>>();

/** The file's bytes: from Cache Storage if it is there, otherwise downloaded and stored. */
export function cachedDownload(url: string): Promise<Uint8Array> {
  let pending = inFlight.get(url);
  if (!pending) {
    pending = download(url).finally(() => inFlight.delete(url));
    inFlight.set(url, pending);
  }
  return pending;
}

/** Deletes stored files whose URL is not in `keep` (for example after a model URL changes). */
export async function forgetOtherFiles(keep: string[]): Promise<void> {
  const cache = await openCache();
  if (!cache) return;
  for (const request of await cache.keys()) {
    if (!keep.includes(request.url)) await cache.delete(request);
  }
}

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : await caches.open(CACHE_NAME);
  } catch {
    return null; // storage blocked: download every time
  }
}

async function download(url: string): Promise<Uint8Array> {
  const cache = await openCache();
  const stored = await cache?.match(url).catch(() => undefined);
  if (stored) return new Uint8Array(await stored.arrayBuffer());

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${url} (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  // Storing can fail (disk full, private window): the model still works, it just downloads next time.
  await cache?.put(url, new Response(bytes)).catch(() => undefined);
  return bytes;
}
