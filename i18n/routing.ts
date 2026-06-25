import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // Add more locales here later (e.g. 'it') + a messages/<locale>.json file.
  locales: ['en', 'hr', 'de'],
  defaultLocale: 'en',
  // Always show the locale in the URL: /en/... and /hr/...
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
