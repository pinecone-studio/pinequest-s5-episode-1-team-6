// Keeps the pose model files in the browser's Cache Storage, so each one downloads once and not again
// on later visits. Google serves the models with only a 1-hour browser cache (max-age=3600), so
// without this the 30 MB Heavy model is downloaded again on most visits. Where Cache Storage is
// missing (old browsers, some private windows) it is a plain download.

const CACHE_NAME = 'rhymnast-pose-models-v1';

/** How far a download is. `total` is null when the server does not say the size. */
export interface DownloadProgress {
  loaded: number;
  total: number | null;
}

type ProgressListener = (progress: DownloadProgress) => void;

/** Downloads in progress, so a preload and a camera start share one download. */
const inFlight = new Map<string, Promise<Uint8Array>>();
/** Latest numbers of each download in progress, for listeners that join halfway. */
const progressNow = new Map<string, DownloadProgress>();
const listeners = new Map<string, Set<ProgressListener>>();

/**
 * Calls back while `url` downloads, starting with the numbers so far if it already started.
 * Nothing is called when the file comes from the cache. Returns a function that stops listening.
 */
export function watchDownload(url: string, listener: ProgressListener): () => void {
  let set = listeners.get(url);
  if (!set) {
    set = new Set();
    listeners.set(url, set);
  }
  set.add(listener);
  const now = progressNow.get(url);
  if (now) listener(now);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(url);
  };
}

function report(url: string, progress: DownloadProgress): void {
  progressNow.set(url, progress);
  listeners.get(url)?.forEach((listener) => listener(progress));
}

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
  const total = Number(response.headers.get('content-length')) || null;
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = await readBody(response, (loaded) => report(url, { loaded, total }));
  } finally {
    progressNow.delete(url);
  }
  // Storing can fail (disk full, private window): the model still works, it just downloads next time.
  await cache?.put(url, new Response(bytes)).catch(() => undefined);
  return bytes;
}

/** Reads the response piece by piece, so progress can be shown. */
async function readBody(response: Response, onProgress: (loaded: number) => void): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  onProgress(0);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
