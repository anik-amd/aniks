/**
 * Album art for the live track.
 *
 * The browser only ever loads images from our own origin, so the edge fetches
 * the Last.fm thumbnail once and serves it from our URL. Only Last.fm's image
 * hosts are allowed, so this cannot be used as an open proxy. Last.fm serves
 * art from both `lastfm` and `lastfm-img` on two CDNs.
 */

type Context = { request: Request };

const HOST = /^lastfm(?:-img\d?)?\.(?:freetls\.fastly|akamaized)\.net$/;
const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 2_500;

export const onRequest = async ({ request }: Context): Promise<Response> => {
  const target = new URL(request.url).searchParams.get('u');
  if (!target) return new Response('missing image', { status: 400 });

  let source: URL;
  try {
    source = new URL(target);
  } catch {
    return new Response('bad image', { status: 400 });
  }
  if (source.protocol !== 'https:' || !HOST.test(source.hostname)) {
    return new Response('blocked host', { status: 400 });
  }

  const cache = caches.default;
  const cacheKey = new Request(
    new URL(`/__now-art?u=${encodeURIComponent(source.toString())}`, request.url).toString(),
    { method: 'GET' },
  );

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let upstream: Response;
  try {
    upstream = await fetch(source.toString(), {
      headers: { accept: 'image/jpeg,image/png,image/webp' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return new Response('no image', { status: 502 });
  }

  const type = upstream.headers.get('content-type')?.split(';')[0].trim() ?? '';
  if (!upstream.ok || !type.startsWith('image/')) return new Response('no image', { status: 404 });

  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return new Response('no image', { status: 404 });
  }

  const response = new Response(bytes, {
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=86400, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
  try {
    await cache.put(cacheKey, response.clone());
  } catch {
    // Serving the bytes matters more than filling the cache.
  }
  return response;
};
