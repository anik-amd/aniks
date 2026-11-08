# Anik Ahmed — personal site

This is my personal site.

I built it as a set of static pages with [Astro](https://astro.build).

## Editing

All copy and links live in [`src/consts.ts`](src/consts.ts); the styling lives in
[`src/styles/global.css`](src/styles/global.css). See [`AGENTS.md`](AGENTS.md) for rules
for agents.

## Build

```sh
npm install
npm run build   # output in dist/
npm test        # checks the built pages
```

Astro 7 needs Node >= 22.23.4.

## Theme

Three states: `system`, `light`, `dark`, stored in `localStorage` under `theme`. `system`
removes the `data-theme` attribute so `prefers-color-scheme` decides. The bootstrap script
in `src/layouts/Base.astro` runs before first paint, so there is no flash.

## Licence

MIT. See [`LICENSE`](LICENSE).
