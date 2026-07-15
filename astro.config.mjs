// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://tryconvi.com',
  integrations: [react(), sitemap()],
  adapter: vercel(),
  // Astro's default Origin-header CSRF check blocks legitimate cross-origin
  // POSTs like the Gumroad Ping webhook. Our API routes don't use
  // cookies/sessions — they're protected by a secret token (webhook) and
  // input validation (other routes) — so this check adds no real security here.
  security: {
    checkOrigin: false,
  },
});