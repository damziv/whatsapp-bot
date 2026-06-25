'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'hr', label: 'HR' },
  { code: 'de', label: 'DE' },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-black/10 p-0.5">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => router.replace(pathname, { locale: l.code })}
          aria-current={locale === l.code ? 'true' : undefined}
          className={`rounded-md px-2 py-1 text-xs font-bold transition ${
            locale === l.code
              ? 'bg-darkmode text-white'
              : 'text-darkmode hover:bg-black/5'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
