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
```

CI runs on every pull request: install, build, then sanity-check `dist/`.

## Design contract

- Palette is driven by CSS custom properties using `light-dark()`. Do not hardcode colours.
- Theme states are `system`, `light`, `dark`, stored in `localStorage` under `theme`.
  `system` means no `data-theme` attribute on `<html>`. The inline script in `Base.astro`
  must keep running before first paint to avoid a flash.
- Serif body, sans-serif only for small UI text. Measure stays under ~65 characters.
- Sections are separated by 1px `--rule` borders. Links are separated by `~`.
- Motion is limited to a 120ms colour transition, disabled under
  `prefers-reduced-motion`.

## SEO invariants

Keep these intact when editing: canonical URL, `og:*` and `twitter:*` tags, JSON-LD
`Person` with `sameAs`, `public/sitemap.xml`, `public/robots.txt`, and a real 404 page
(Cloudflare returns 200 for unknown paths without one).

## Deploy

Cloudflare Pages project `aniks`, production branch `main`, build command
`npm run build`, output directory `dist`, `NODE_VERSION=22`. Pushes to `main` deploy;
other branches get preview URLs. Do not change the project name — it is the subdomain
and cannot be renamed.
