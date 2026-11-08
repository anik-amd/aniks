# Anik Ahmed — personal site

This is my personal site: <https://aniks.pages.dev>.

I built it as a set of static pages with [Astro](https://astro.build) and deploy it to
Cloudflare Pages. No client-side framework, no web fonts, no trackers, no analytics.

## Editing

All copy and links live in [`src/consts.ts`](src/consts.ts); the styling lives in
[`src/styles/global.css`](src/styles/global.css). [`AGENTS.md`](AGENTS.md) records the
rules I follow when changing either.

## Build

```sh
npm install
npm run build   # output in dist/
npm test        # checks the built pages
```

Astro 7 needs Node >= 22.23.4. My laptop has no local toolchain on purpose, so builds run
in CI and on Cloudflare Pages.

## Deploy

GitHub Actions builds, tests and deploys with `wrangler pages deploy`. Cloudflare's own Git
builds are switched off so nothing deploys twice.

- pull request → preview at `<branch>.aniks.pages.dev`
- `main` → production at <https://aniks.pages.dev>, then a smoke test

## Theme

Three states: `system`, `light`, `dark`, stored in `localStorage` under `theme`. `system`
removes the `data-theme` attribute so `prefers-color-scheme` decides. The bootstrap script
in `src/layouts/Base.astro` runs before first paint, so there is no flash.

## Licence

The words are mine. The code is free to learn from.
