# aniks

Personal site for Anik Ahmed — <https://aniks.pages.dev>.

Statically pre-rendered with [Astro](https://astro.build), deployed to Cloudflare Pages.
No client-side framework, no web fonts, no trackers.

## Editing

Content and links live in [`src/consts.ts`](src/consts.ts). Styling lives in
[`src/styles/global.css`](src/styles/global.css). See [AGENTS.md](AGENTS.md) for the rules
agents should follow.

## Build

```sh
npm install
npm run build   # output in dist/
```

Node >= 22.23.4 is required by Astro 7. The author's machine intentionally has no local
toolchain: builds run in CI and in Cloudflare Pages.

## Deploy

Cloudflare Pages, Git integration, project `aniks`.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION=22` |

Every push to `main` deploys to production; other branches get preview deployments.

## Theme

Three states: `system`, `light`, `dark`. Stored in `localStorage` under `theme`; `system`
removes the `data-theme` attribute so `prefers-color-scheme` decides. The bootstrap
script in `src/layouts/Base.astro` runs before first paint to prevent a flash.

## Licence

Content © Anik Ahmed. Code is free to learn from.
