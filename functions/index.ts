/**
 * Live "Last played" for the Now row.
 *
 * The page is static; this function runs on a visit to `/` and swaps the
 * contents between the now:music markers for the newest Last.fm scrobble.
 * The fragment is cached for a minute at the edge, so a burst of visits is
 * one API call. If the key is missing or Last.fm fails, the static block
 * stays exactly as built.
 *
 * The deploy builds this with wrangler and `wrangler pages deploy` uploads it
 * alongside dist, so it must stay a plain `onRequest` export.
 */

type Env = { LASTFM_API_KEY?: string };
type Context = {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
};

const LASTFM_USER = 'anik91';
const LASTFM_PROFILE = `https://www.last.fm/user/${LASTFM_USER}`;
const LASTFM_PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';
const CACHE_SECONDS = 60;
const TIMEOUT_MS = 2_000;

type Track = {
  artist: string;
  track: string;
  playedAt: string;
  art: string | null;
};

const escape = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );

/** Absolute, in the same timezone the build uses, so the two never disagree. */
const formatPlayed = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Dhaka',
  }).format(new Date(iso));

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const readTrack = async (apiKey: string): Promise<Track | null> => {
  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  url.searchParams.set('method', 'user.getrecenttracks');
  url.searchParams.set('user', LASTFM_USER);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    error?: number;
    recenttracks?: { track?: unknown };
  };
  if (data.error) return null;

  const raw = data.recenttracks?.track;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

  // The newest entry can be mid-play and carry no scrobble date. "Last played"
  // means the newest completed scrobble, so skip anything without one.
  const entry = list.find((item) => {
    const uts = Number((item as { date?: { uts?: string } })?.date?.uts);
    return Number.isFinite(uts) && uts > 0;
  }) as
    | {
        name?: string;
        artist?: string | { '#text'?: string };
        date?: { uts?: string };
        image?: { size?: string; '#text'?: string }[];
      }
    | undefined;
  if (!entry) return null;

  const artist = clean(typeof entry.artist === 'string' ? entry.artist : entry.artist?.['#text']);
  const track = clean(entry.name);
  const uts = Number(entry.date?.uts);
  if (!track || !Number.isFinite(uts) || uts <= 0) return null;

  const images = Array.isArray(entry.image) ? entry.image : [];
  const art =
    ['extralarge', 'large', 'medium']
      .map((size) => images.find((image) => image.size === size)?.['#text'])
      .find((src) => typeof src === 'string' && src.startsWith('https://') && !src.includes(LASTFM_PLACEHOLDER)) ??
    null;

  return { artist, track, playedAt: new Date(uts * 1000).toISOString(), art };
};

/** Same markup the page builds, so one set of styles covers both. */
const render = (track: Track): string => {
  const label = `${track.track}${track.artist ? ` by ${track.artist}` : ''}, open my Last.fm profile`;
  const art = track.art
    ? `<img class="now-art" src="/now-art?u=${encodeURIComponent(track.art)}" alt="" width="64" height="64" loading="lazy" decoding="async">`
    : `<span class="now-art now-art-empty" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></svg></span>`;

  return `<a class="now-player" data-now="live" href="${LASTFM_PROFILE}" target="_blank" rel="noopener noreferrer" aria-label="${escape(label)}"><span class="now-label">Last played</span><span class="now-row"><span class="now-art-wrap">${art}<span class="now-play" aria-hidden="true"><svg viewBox="0 0 12 12" fill="currentColor" focusable="false"><path d="M3 1.8v8.4L10 6z"/></svg></span></span><span class="now-copy"><span class="now-track">${escape(track.track)}</span>${track.artist ? `<span class="now-artist">${escape(track.artist)}</span>` : ''}<span class="now-state"><time datetime="${escape(track.playedAt)}">${escape(formatPlayed(track.playedAt))}</time></span></span></span></a>`;
};

/** The minute-old fragment, or a fresh one from Last.fm. */
const musicFragment = async (apiKey: string, url: URL): Promise<string | null> => {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/__now-music', url).toString(), { method: 'GET' });

  const hit = await cache.match(cacheKey);
  if (hit) return hit.text();

  const track = await readTrack(apiKey);
  if (!track) return null;

  const fragment = render(track);
  try {
    await cache.put(
      cacheKey,
      new Response(fragment, { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } }),
    );
  } catch {
    // A failed cache write still leaves a usable fragment for this request.
  }
  return fragment;
};

export const onRequest = async ({ request, env, next }: Context): Promise<Response> => {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname !== '/') return next();

  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;

  let html = await response.text();
  let live = false;

  if (env.LASTFM_API_KEY) {
    try {
      const fragment = await musicFragment(env.LASTFM_API_KEY, url);
      if (fragment) {
        const patched = html.replace(
          /<!--now:music-->[\s\S]*?<!--\/now:music-->/,
          `<!--now:music-->${fragment}<!--/now:music-->`,
        );
        live = patched !== html;
        html = patched;
      }
    } catch {
      // A broken edge call must never take the page down: keep the snapshot.
    }
  }

  // Proof for the deploy smoke test that the function ran, live or fallback.
  html = html.replace('</body>', '<!--now:edge--></body>');

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('x-now', live ? 'live' : 'static');

  return new Response(html, { status: response.status, headers });
};
