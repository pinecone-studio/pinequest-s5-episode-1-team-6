import { afterEach, vi } from 'vitest';
import { test, assertEqual } from './harness';
import { cachedDownload, forgetOtherFiles, watchDownload } from '../lib/modelCache';

// A pretend network and Cache Storage, so we can count downloads.
function fakeBrowser({ withCache = true, status = 200 } = {}) {
  const stored = new Map<string, ArrayBuffer>();
  const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status }));
  vi.stubGlobal('fetch', fetchMock);
  if (withCache) {
    const cache = {
      match: async (url: string) => (stored.has(url) ? new Response(stored.get(url)) : undefined),
      put: async (url: string, response: Response) => void stored.set(url, await response.arrayBuffer()),
      keys: async () => [...stored.keys()].map((url) => ({ url })),
      delete: async (request: { url: string }) => stored.delete(request.url),
    };
    vi.stubGlobal('caches', { open: async () => cache });
  } else {
    vi.stubGlobal('caches', undefined);
  }
  return { fetchMock, stored };
}

afterEach(() => vi.unstubAllGlobals());

test('a model downloads once and comes from the cache after that', async () => {
  const { fetchMock } = fakeBrowser();
  const first = await cachedDownload('https://models.example/a.task');
  const second = await cachedDownload('https://models.example/a.task');
  assertEqual(fetchMock.mock.calls.length, 1);
  assertEqual(first.length, 3);
  assertEqual(second[2], 3);
});

test('a preload and a camera start at the same time share one download', async () => {
  const { fetchMock } = fakeBrowser();
  await Promise.all([cachedDownload('https://models.example/b.task'), cachedDownload('https://models.example/b.task')]);
  assertEqual(fetchMock.mock.calls.length, 1);
});

test('without Cache Storage the model still downloads', async () => {
  const { fetchMock } = fakeBrowser({ withCache: false });
  const bytes = await cachedDownload('https://models.example/c.task');
  assertEqual(bytes.length, 3);
  assertEqual(fetchMock.mock.calls.length, 1);
});

test('a failed download is an error and is not stored', async () => {
  const { stored } = fakeBrowser({ status: 404 });
  const error = await cachedDownload('https://models.example/d.task').catch((err: Error) => err.message);
  assertEqual(typeof error === 'string' && error.includes('404'), true);
  assertEqual(stored.size, 0);
});

test('files no longer in use are removed from the cache', async () => {
  const { stored } = fakeBrowser();
  await cachedDownload('https://models.example/old.task');
  await cachedDownload('https://models.example/new.task');
  await forgetOtherFiles(['https://models.example/new.task']);
  assertEqual([...stored.keys()].join(), 'https://models.example/new.task');
});

test('progress is reported while a model downloads, also to someone who joins late', async () => {
  fakeBrowser({ withCache: false });
  const seen: number[] = [];
  const stop = watchDownload('https://models.example/e.task', ({ loaded }) => seen.push(loaded));
  await cachedDownload('https://models.example/e.task');
  stop();
  assertEqual(seen[0], 0);
  assertEqual(seen[seen.length - 1], 3);
});
