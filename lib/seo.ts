import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

// Default social-share image (swap for a dedicated 1200×630 og.png later).
const OG_IMAGE = '/images/hero/banner-image1.png';

/**
 * Build per-page, locale-aware metadata: title, description, hreflang
 * alternates for every locale, and Open Graph / Twitter tags.
 * URLs are relative — they resolve against `metadataBase` (set in the root layout).
 */
export function pageMetadata(opts: {
  locale: string;
  path: string; // '' for home, '/demo', '/register', …
  title: string;
  description: string;
}): Metadata {
  const { locale, path, title, description } = opts;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${path}`;

  const url = `/${locale}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      title,
      description,
      url,
      siteName: 'QRevent',
      type: 'website',
      locale,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}
