/**
 * Refreshes src/data/activity.json and the covers it points at.
 *
 * Runs on a weekly schedule in CI, never during a build: the site reads the
 * committed snapshot, so a blocked scraper can only make the snapshot older,
 * never break a deploy. Covers are self-hosted, named by content hash, and
 * pruned when nothing references them any more.
 *
 *   LASTFM_API_KEY=... node scripts/fetch-activity.mjs
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const FILE = new URL('../src/data/activity.json', import.meta.url);
const COVERS = new URL('../public/covers/', import.meta.url);
const LASTFM_USER = 'anik91';
const GOODREADS_PROFILE = 'https://www.goodreads.com/anik_amd';
const GOODREADS_ORIGIN = 'https://www.goodreads.com';
const MAX_BOOKS = 3;
const TIMEOUT_MS = 20_000;
const MAX_IMAGE_BYTES = 400_000;
// Last.fm serves this image when a track has no artwork.
const LASTFM_PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const log = (message) => console.log(message);
const warn = (message) => console.warn(`warning: ${message}`);

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

/** Scraped markup is untrusted: drop tags, decode entities, collapse space. */
const clean = (value) =>
  value
    .replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/\s+/g, ' ')
    .trim();

const get = async (url, accept = 'text/html,application/xhtml+xml') => {
  const response = await fetch(url, {
    headers: { 'user-agent': UA, accept },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response;
};

/**
 * Downloads one image and stores it under a content hash, so the same bytes
 * keep the same name and an unchanged week commits nothing. Returns the public
 * path, or null when the image is missing, too big, or not a format we serve.
 */
const storeImage = async (url, label) => {
  if (!url) return null;
  try {
    const response = await get(url, 'image/jpeg,image/png,image/webp');
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
    if (!extension) {
      warn(`cover: ${type || 'unknown type'} for ${label}`);
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength < 1000 || bytes.byteLength > MAX_IMAGE_BYTES) {
      warn(`cover: ${bytes.byteLength} bytes for ${label}, skipped`);
      return null;
    }

    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
    const name = `${label}-${hash}.${extension}`;
    await mkdir(COVERS, { recursive: true });
    await writeFile(new URL(name, COVERS), bytes);
    return `/covers/${name}`;
  } catch (error) {
    warn(`cover: ${error.message}`);
    return null;
  }
};

/** The profile page still carries the currently-reading shelf; the RSS feed is gone. */
const readBooks = async () => {
  const html = await (await get(GOODREADS_PROFILE)).text();
  const start = html.indexOf('currentlyReadingReviews');
  if (start === -1) throw new Error('currently-reading block not found');

  const end = html.indexOf('</section>', start);
  const shelf = html.slice(start, end === -1 ? undefined : end);

  const found = [];
  const seen = new Set();
  for (const block of shelf.split('class="Updates').slice(1)) {
    const title = block.match(/<a\b[^>]*class="bookTitle"[^>]*>([\s\S]*?)<\/a>/);
    if (!title) continue;

    const href = title[0].match(/href="([^"]+)"/);
    const author = block.match(/<a\b[^>]*class="authorName"[^>]*>([\s\S]*?)<\/a>/);
    const image = block.match(/<img\b[^>]*src="([^"]+)"/);
    const name = clean(title[1]);
    if (!name || !href) continue;

    const url = new URL(href[1], GOODREADS_ORIGIN).href;
    if (seen.has(url)) continue;
    seen.add(url);

    found.push({
      title: name,
      author: author ? clean(author[1]) : '',
      url,
      // The profile ships a 98px thumbnail; ask for something a 112px slot can use on 2x.
      image: image ? image[1].replace(/\._S[XY]\d+_/, '._SX318_') : '',
    });
    if (found.length === MAX_BOOKS) break;
  }

  if (found.length === 0) throw new Error('currently-reading shelf is empty or unparsable');
  return found;
};

const readMusic = async (apiKey) => {
  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  url.searchParams.set('method', 'user.getrecenttracks');
  url.searchParams.set('user', LASTFM_USER);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');

  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${response.status} from last.fm`);

  const data = await response.json();
  if (data.error) throw new Error(`last.fm said: ${data.message}`);

  const raw = data?.recenttracks?.track;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  // The newest entry may be a track that is still playing, which has no
  // scrobble date yet. "Last played" means the newest completed scrobble.
  const track = list.find((entry) => Number(entry?.date?.uts) > 0) ?? list[0];
  if (!track) throw new Error('last.fm returned no recent track');

  const artist = typeof track.artist === 'string' ? track.artist : track.artist?.['#text'];
  if (!track.name || !artist) throw new Error('last.fm returned a track without a name');

  const images = Array.isArray(track.image) ? track.image : [];
  const artwork = ['extralarge', 'large', 'medium']
    .map((size) => images.find((entry) => entry.size === size)?.['#text'])
    .find((src) => src && !src.includes(LASTFM_PLACEHOLDER));

  const played = Number(track.date?.uts);
  return {
    artist: clean(String(artist)),
    track: clean(String(track.name)),
    playedAt: Number.isFinite(played) && played > 0 ? new Date(played * 1000).toISOString() : null,
    image: artwork ?? '',
  };
};

const readSnapshot = async () => {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return null;
  }
};

/** Drops covers that nothing in the snapshot points at any more. */
const pruneCovers = async (keep) => {
  const files = await readdir(COVERS).catch(() => []);
  for (const file of files) {
    if (!keep.has(file)) {
      await rm(new URL(file, COVERS), { force: true });
      log(`pruned covers/${file}`);
    }
  }
};

const previous = await readSnapshot();

let music = previous?.music ?? null;
if (process.env.LASTFM_API_KEY) {
  music = await readMusic(process.env.LASTFM_API_KEY).catch((error) => {
    warn(`music: ${error.message}`);
    return previous?.music ?? null;
  });
} else {
  warn('music: LASTFM_API_KEY is not set, keeping the previous track');
}

if (music?.image) {
  music.art = await storeImage(music.image, 'art');
  delete music.image;
} else if (music && music.art === undefined) {
  music.art = null;
}

const rawBooks = await readBooks().catch((error) => {
  warn(`books: ${error.message}`);
  return previous?.books ?? [];
});

const books = [];
for (const book of rawBooks) {
  const cover = book.image ? await storeImage(book.image, 'book') : (book.cover ?? null);
  books.push({ title: book.title, author: book.author, url: book.url, cover });
}

const next = { updated: previous?.updated ?? null, music, books };
const keep = new Set(
  [music?.art, ...books.map((book) => book.cover)]
    .filter(Boolean)
    .map((path) => path.split('/').pop()),
);

// Compare without the timestamp so an unchanged week writes nothing.
const comparable = (value) => JSON.stringify({ ...value, updated: undefined });
if (previous && comparable(previous) === comparable(next)) {
  await pruneCovers(keep);
  log('snapshot unchanged');
  process.exit(0);
}

if (!music && books.length === 0) {
  warn('nothing to write, keeping the snapshot');
  process.exit(0);
}

next.updated = new Date().toISOString();
await writeFile(FILE, `${JSON.stringify(next, null, 2)}\n`);
await pruneCovers(keep);
log(`snapshot updated at ${next.updated}`);
