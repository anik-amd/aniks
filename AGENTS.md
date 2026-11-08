# AGENTS.md

Rules for anyone (human or agent) changing this repository.

## What this is

Personal site for Anik Ahmed, statically pre-rendered with Astro and deployed to
Cloudflare Pages at <https://aniks.pages.dev>. One page today; a Markdown blog and
project pages are planned.

## Hard constraints

- **No local installs.** Do not run `npm install`, `npm run dev`, or `npx astro` on the
  author's machine. Dependencies are installed only in CI and in Cloudflare Pages.
  Editing files and `git push` is the whole local workflow.
- **Zero client JS by default.** The only script allowed is the inline theme switcher.
  Anything else needs a reason.
- **No web fonts, no analytics SDKs, no images.** Typography is the system serif stack.
  The single raster asset is `public/og.png`.
- **Free tier only.** Cloudflare Pages free plan, GitHub Free, GitHub Actions under
  2,000 minutes/month. Do not add scheduled workflows or matrices.

## Stack

- Astro 7, static output, no adapter, no integrations
- Plain CSS in `src/styles/global.css` (no Tailwind, no CSS framework)
- npm, Node >= 22.23.4 (Astro 7 requires it)

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

## Commands (CI / codespace only)

```
npm install
npm run build     # writes dist/
npm test          # scripts/check-build.mjs, checks dist/
```

## Pipeline

GitHub Actions owns build, test and deploy. Cloudflare Pages automatic deployments
must stay disabled.

1. Pull request: install, build, `npm test`, upload `dist/`, then deploy a Cloudflare
   **preview** for the branch. The author reviews the preview URL before anything ships.
2. Merge to `main`: same build and tests, then `wrangler pages deploy` to production,
   followed by a smoke test against <https://aniks.pages.dev>.

Never deploy straight to production. Preview first, wait for confirmation, then merge.

Secrets required: `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit) and
`CLOUDFLARE_ACCOUNT_ID`.

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
- Serif body, sans-serif only for small UI text. Measure stays under ~65 characters.
- The name is the page's one large thing. Sections are separated by space, not by rules;
  section titles hang in a left column with their links in the right one. The quote is
  the page's only field of colour (`--panel`), opened by an accent quotation mark.
- Links sit in a wrapped row with generous gaps and no separator glyph; underlines use
  the accent.
- Motion is limited to a 180ms colour and icon transition, disabled under
  `prefers-reduced-motion`.

## SEO invariants

Keep these intact when editing: canonical URL, `og:*` and `twitter:*` tags, JSON-LD
`Person` with `sameAs`, `public/sitemap.xml`, `public/robots.txt`, and a real 404 page
(Cloudflare returns 200 for unknown paths without one).

## Deploy

Cloudflare Pages project `aniks` (project name is the subdomain and cannot be renamed).
Deployment is performed by GitHub Actions with `wrangler pages deploy`, not by
Cloudflare's own Git builds — keep "Automatic deployments" disabled in the Pages
settings so builds are not duplicated.

- Pull requests → preview deployment on branch alias `<branch>.aniks.pages.dev`
- `main` → production deployment on <https://aniks.pages.dev>, then a smoke test
