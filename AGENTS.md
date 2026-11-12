# AGENTS.md

Rules for anyone (human or agent) changing this repository.

## What this is

Personal site for Anik Ahmed, statically pre-rendered with Astro. One page today; a
Markdown blog and project pages are planned.

## Constraints

- **Zero client JS in the source.** The only script the repo ships is the inline theme
  switcher. Anything else needs a reason. The host may append a cookieless analytics
  beacon at the edge; that is configured outside the repo and never vendored here.
- **One self-hosted font, no analytics libraries, no images.** Instrument Sans, subset to
  Latin, lives in `public/fonts/` with its OFL licence. Nothing is fetched from a font CDN
  and no other family is added. The single raster asset is `public/og.png`.

## Stack

- Astro 7, static output, no adapter, no integrations
- Plain CSS in `src/styles/global.css` (no Tailwind, no CSS framework)
- Node >= 22.23.4 (Astro 7 requires it)

## Layout

```
src/consts.ts          site metadata, every link, the quote
src/layouts/Base.astro <head>, theme bootstrap, masthead, footer
src/components/        ThemeToggle
src/pages/index.astro  the single page
src/pages/404.astro    error page
src/styles/global.css  all styling
public/                robots.txt, sitemap.xml, _headers, favicon.svg, og.png
```

Links and copy live in `src/consts.ts`. Adding a link means editing that file, not the page.

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
- One family throughout (`--font`), weight and size carry the hierarchy. Measure stays
  under ~65 characters.
- The name is the page's one large thing. Sections are separated by space, not by rules;
  section titles hang in a left column with their links in the right one. The quote is
  the page's only field of colour (`--panel`), opened by an accent quotation mark.
- Links sit in a wrapped row with generous gaps and no separator glyph; underlines use
  the accent.
- Motion is CSS only: a 320ms colour fade on theme change, a 180ms icon swap, and a
  short staggered entrance on first paint. Everything is disabled under
  `prefers-reduced-motion`.

## SEO invariants

Keep these intact when editing: canonical URL, `og:*` and `twitter:*` tags, JSON-LD
`Person` with `sameAs`, `public/sitemap.xml`, `public/robots.txt`, and a real 404 page
(without one, unknown paths answer 200).
