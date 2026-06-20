'use client';

import { useEffect } from 'react';

// The <html> element lives in the root layout (so /auth and 404 keep working),
// so we set its lang attribute on the client to match the active locale.
export default function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
