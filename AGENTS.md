# AGENTS.md

Rules for anyone (human or agent) changing this repository.

## What this is

Personal site for Anik Ahmed, statically pre-rendered with Astro. One page today; a
Markdown blog and project pages are planned.

## Constraints

- **Zero client JS in the source.** The only script the repo ships is the inline theme
  switcher. Anything else needs a reason. The host may append a cookieless analytics
  beacon at the edge; that is configured outside the repo and never vendored here.
- **Two self-hosted fonts, no analytics libraries, no remote images.** Fraunces for the name and
  the quote, IBM Plex Sans for everything else. Both are subset to Latin and live in
  `public/fonts/` with their OFL licences. Nothing is fetched from a font CDN and no third
  family is added. Raster assets are `public/og.png` and the cover thumbnails in
  `public/covers/`. Covers are downloaded by the weekly snapshot, named by content hash and
  never hotlinked from Goodreads or Last.fm.

## Stack

- Astro 7, static output, no adapter, no integrations
- Plain CSS in `src/styles/global.css` (no Tailwind, no CSS framework)
- Node >= 22.23.4 (Astro 7 requires it)

## Layout

```
src/consts.ts          site metadata, every link, the quote
src/data/activity.json the weekly Now snapshot (bot-maintained)
src/data/activity.ts   validates that snapshot, drops anything malformed
src/layouts/Base.astro <head>, theme bootstrap, masthead, footer
src/components/        ThemeToggle
src/pages/index.astro  the single page
src/pages/404.astro    error page
src/styles/global.css  all styling
scripts/               fetch-activity.mjs (network), check-build.mjs (CI)
functions/             index.ts (live track swap), now-art.ts (art proxy)
public/covers/         hash-named cover thumbnails, refreshed weekly
public/                robots.txt, sitemap.xml, _headers, favicon.svg, og.png
```

Links and copy live in `src/consts.ts`. Adding a link means editing that file, not the page.

## Now snapshot

The Now section reads `src/data/activity.json`; nothing fetches Last.fm or Goodreads during
a build. `scripts/fetch-activity.mjs` refreshes the file weekly from CI (Mondays 05:17 UTC,
plus manual dispatch), using `LASTFM_API_KEY` from the Actions secrets. Goodreads has no
usable feed any more, so the script reads its profile page; Last.fm is read through its API.
The script never fails a run — a blocked or broken source leaves the previous snapshot in
place.

The same run downloads album art and book covers into `public/covers/`, names each file by a
hash of its bytes and deletes any cover nothing points at. That is why a cover path in the
snapshot is always `/covers/<hash>.<ext>` and never a remote URL.

That weekly bot commit is the single exception to "never ship unreviewed work": it touches
only `src/data/activity.json` and `public/covers/`, and the same run builds, tests and
deploys the bytes it commits.

## Live track

`functions/index.ts` is a Pages Function on `/`. On a visit it reads Last.fm with
`LASTFM_API_KEY` and swaps the contents between the `now:music` markers, caching the
fragment for 60 seconds at the edge. Nothing runs on a timer; a visit is the trigger. If
the key is missing, Last.fm errors, or the request is not the homepage, the static block
is served untouched and `x-now: static` says so. The function also appends `<!--now:edge-->`
so the deploy smoke test can prove it ran.

`functions/now-art.ts` proxies the live track's album art so the browser still loads images
only from our origin. It accepts Last.fm image hosts only, caches for a day, and refuses
anything over 1 MB.

Both deploy jobs check the repository out, because `wrangler pages deploy` bundles
`functions/` from the working directory. CI runs `wrangler pages functions build` before
uploading `dist`, so a broken function fails the build rather than the deploy.

## Commands

```
npm install
npm run build     # writes dist/
npm test          # scripts/check-build.mjs, checks dist/
```

## Pipeline

A pull request is built, tested and deployed as a preview. Once the preview is approved,
the pull request is merged and the same build ships. Never ship unreviewed work.

## Design contract

- Palette is driven by CSS custom properties. Do not hardcode colours; add a token and
  define it in all three blocks (`:root`, `:root[data-theme='dark']`, and the
  `prefers-color-scheme` media query). `light-dark()` is deliberately avoided — it
  resolved inconsistently across elements and broke contrast.
- Theme states are `system`, `light`, `dark`, stored in `localStorage` under `theme`.
  `system` means no `data-theme` attribute on `<html>`. The inline script in `Base.astro`
  must keep running before first paint to avoid a flash. One icon button cycles the three
  states: half-filled circle for system, sun for light, crescent for dark. The glyphs sit in
  one grid cell and cross-fade.
- Two families, no more: `--display` (Fraunces) carries the name, the quote and the 404;
  `--font` (IBM Plex Sans) carries body copy, headings and UI. Weight and size do the
  rest. Measure stays under ~65 characters.
- The name is the page's one large thing. Sections are separated by space, not by rules;
  section titles hang in a left column with their links in the right one. The quote is
  the page's one full-bleed field of colour (`--panel`), opened by an accent quotation mark.
- Now is a coda to the intro, not a section: it starts close to the bio and stays one
  left-aligned cluster of two groups, each a tiny 11px sentence-case label over its
  content. The labels are also the exits — "Last played" opens the Last.fm profile (the
  whole player does), "Reading" opens the Goodreads shelf — so there is no separate
  "See more" link. A lone book shows its cover, title and author; two or three show
  covers only and scroll sideways. Album art and covers share one shadow token and read
  as objects, not pictures in frames; covers lift on hover. Covers are the only images
  besides `og.png`, and the quote stays the page's only full-bleed panel.
- Links sit in a wrapped row with generous gaps and no separator glyph; underlines use
  the accent.
- Motion is CSS only: a 320ms colour fade on theme change, a 180ms icon swap, a short
  staggered entrance on first paint, and a 200ms lift on covers. Everything is disabled
  under `prefers-reduced-motion`.

## SEO invariants

Keep these intact when editing: canonical URL, `og:*` and `twitter:*` tags, JSON-LD
`Person` with `sameAs`, `public/sitemap.xml`, `public/robots.txt`, and a real 404 page
(without one, unknown paths answer 200).
