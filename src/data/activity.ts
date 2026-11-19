/**
 * The weekly snapshot, validated.
 *
 * `scripts/fetch-activity.mjs` writes activity.json; this module is the only
 * thing that reads it. Everything is treated as untrusted: a field that fails
 * validation is dropped rather than rendered.
 */
import raw from './activity.json';

export type Music = {
  artist: string;
  track: string;
  /** ISO timestamp of the scrobble, or null when it cannot be known. */
  playedAt: string | null;
  /** Self-hosted album art, or null when the track has none. */
  art: string | null;
};

export type Book = {
  title: string;
  author: string;
  /** Goodreads book page. */
  url: string;
  /** Self-hosted cover, or null when the shelf entry has none. */
  cover: string | null;
};

export type Activity = {
  /** ISO timestamp of the last successful refresh. */
  updated: string | null;
  music: Music | null;
  books: Book[];
};

const MAX_BOOKS = 3;
const MAX_TITLE = 120;
const MAX_ARTIST = 80;

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Only https links on the expected host survive. */
const link = (value: unknown, host: string): string => {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    const allowed = url.protocol === 'https:' && (url.hostname === host || url.hostname.endsWith(`.${host}`));
    return allowed ? url.href : '';
  } catch {
    return '';
  }
};

const isoDate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

/** Covers are local, hash-named files and nothing else. */
const cover = (value: unknown): string | null =>
  typeof value === 'string' && /^\/covers\/[a-z0-9-]+\.(?:jpg|png|webp)$/.test(value) ? value : null;

const readMusic = (value: unknown): Music | null => {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;

  const track = text(source.track, MAX_TITLE);
  if (!track) return null;

  const playedAt = isoDate(source.playedAt);
  return {
    artist: text(source.artist, MAX_ARTIST),
    track,
    playedAt,
    art: cover(source.art),
  };
};

const readBooks = (value: unknown): Book[] => {
  if (!Array.isArray(value)) return [];

  const books: Book[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const source = entry as Record<string, unknown>;

    const title = text(source.title, MAX_TITLE);
    const url = link(source.url, 'goodreads.com');
    if (!title || !url || seen.has(url)) continue;
    seen.add(url);

    books.push({
      title,
      author: text(source.author, MAX_ARTIST),
      url,
      cover: cover(source.cover),
    });
    if (books.length === MAX_BOOKS) break;
  }
  return books;
};

const source = raw as Record<string, unknown>;

export const ACTIVITY: Activity = {
  updated: isoDate(source.updated),
  music: readMusic(source.music),
  books: readBooks(source.books),
};
