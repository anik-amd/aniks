import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://aniks.pages.dev',
  // Keep the whitespace between inline elements so the markup reads as written.
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
