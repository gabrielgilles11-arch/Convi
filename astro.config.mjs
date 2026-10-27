// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import { contentUpdated } from './src/lib/seo.ts';

/**
 * Which edition a scenario URL belongs to, for its lastmod.
 * @param {string} url
 * @returns {'es-ES' | 'sv-SE' | 'de-DE' | null}
 */
function scenarioLocale(url) {
  const path = new URL(url).pathname;
  if (path.startsWith('/sv/scenarios')) return 'sv-SE';
  if (path.startsWith('/de/scenarios')) return 'de-DE';
  if (path.startsWith('/scenarios')) return 'es-ES';
  return null;
}

// https://astro.build/config
export default defineConfig({
  site: 'https://tryconvi.com',
  // Every internal link is written without a trailing slash, so the site
  // serves one spelling and redirects the other. Two live copies of each page
  // had Google discarding the slashed URLs the sitemap listed as duplicates.
  trailingSlash: 'never',
  integrations: [
    react(),
    sitemap({
      // /stats is an internal readout behind a token. It answers 404 without
      // one, but there is no reason to advertise it either.
      filter: (page) => !page.includes('/stats'),
      // A lastmod only where there is a real date for it: the edition's
      // content file, from git. Nothing is sent when the date is unknown.
      serialize(item) {
        const url = item.url.length > 'https://tryconvi.com/'.length ? item.url.replace(/\/+$/, '') : item.url;
        const locale = scenarioLocale(url);
        const updated = locale ? contentUpdated(locale) : null;
        return { ...item, url, ...(updated ? { lastmod: updated.toISOString() } : {}) };
      },
    }),
  ],
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  // Astro's default Origin-header CSRF check blocks legitimate cross-origin
  // POSTs like the Gumroad Ping webhook. Our API routes don't use
  // cookies/sessions — they're protected by a secret token (webhook) and
  // input validation (other routes) — so this check adds no real security here.
  security: {
    checkOrigin: false,
  },
});