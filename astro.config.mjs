import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://aniks.pages.dev',
  // Astro 7 defaults to JSX whitespace handling, which eats the spaces between
  // inline elements (the "~" separators between links). Keep HTML-aware
  // whitespace so the markup reads as written.
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
