'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

// The single, always-open demo album seeded by scripts/seed-demo.ts.
const DEMO_CODE = (process.env.NEXT_PUBLIC_DEMO_CODE || 'DEMO').toUpperCase();

// Only show *live* uploads from the last couple of hours so the demo gallery
// stays fresh and stray uploads roll off on their own.
const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

// Curated tiles that are always present (so the gallery is never empty/junky).
const SAMPLES = [
  '/images/insta/insta1.png',
  '/images/insta/insta2.png',
  '/images/insta/insta3.png',
  '/images/insta/insta4.png',
];

type Item = { id: string; url: string; created_at: string; mime?: string | null };

function isVideo(m?: string | null) {
  return !!m && m.toLowerCase().startsWith('video/');
}

export default function DemoPage() {
  const t = useTranslations('Demo');
  const [origin, setOrigin] = useState('');
  const [live, setLive] = useState<Item[]>([]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const waHref = origin ? `${origin}/w?code=${DEMO_CODE}` : `#`;
  const qrSrc = origin
    ? `/api/qr?data=${encodeURIComponent(`${origin}/w?code=${DEMO_CODE}`)}`
    : '';

  const loadLive = useCallback(async () => {
    try {
      const r = await fetch(`/api/gallery?code=${encodeURIComponent(DEMO_CODE)}`, {
        cache: 'no-store',
      });
      if (!r.ok) return;
      const data = (await r.json()) as { items?: Item[] };
      const cutoff = Date.now() - LIVE_WINDOW_MS;
      const recent = (data.items || []).filter(
        (it) => new Date(it.created_at).getTime() >= cutoff
      );
      setLive(recent);
    } catch {
      // demo gallery is best-effort; ignore transient errors
    }
  }, []);

  // Poll so a just-sent photo appears within a few seconds — the "aha" moment.
  useEffect(() => {
    loadLive();
    const t = setInterval(loadLive, 6000);
    return () => clearInterval(t);
  }, [loadLive]);

  const scrollToTry = () => {
    document.getElementById('try')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="bg-gradient-to-b from-brand-50 to-white dark:from-neutral-900 dark:to-neutral-950">
      {/* ---------------- HERO ---------------- */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-32 pb-12 text-center">
        <div className="mx-auto w-fit rounded-full bg-brand-600/10 px-4 py-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
          {t('eyebrow')}
        </div>
        <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.02em] sm:text-5xl">
          {t('titleLine1')} <span className="text-brand-600">{t('titleHighlight')}</span>
          <br className="hidden sm:block" /> {t('titleLine2')}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-neutral-600 dark:text-neutral-300">
          {t('subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={scrollToTry}
            className="inline-flex h-12 items-center justify-center rounded-full bg-brand-600 px-7 text-base font-semibold text-white transition hover:bg-brand-700"
          >
            {t('tryDemoCta')}
          </button>
          <a
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-7 text-base font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:hover:bg-white/10"
          >
            {t('getStarted')}
          </a>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS (photographer) ---------------- */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className="text-center text-2xl font-semibold tracking-[-0.02em]">
          {t('howTitle')}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
                {n}
              </div>
              <div className="mt-4 text-lg font-semibold">{t(`step${n}Title`)}</div>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{t(`step${n}Desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- TRY IT LIVE ---------------- */}
      <section id="try" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-12">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">{t('tryTitle')}</h2>
              <ol className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <li><span className="font-semibold text-brand-600">1.</span> {t('tryStep1')}</li>
                <li><span className="font-semibold text-brand-600">2.</span> {t('tryStep2')}</li>
                <li><span className="font-semibold text-brand-600">3.</span> {t('tryStep3')}</li>
              </ol>

              <div className="mt-6 flex flex-wrap items-center gap-5">
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrSrc}
                    alt="Scan to open WhatsApp"
                    width={150}
                    height={150}
                    className="rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
                  />
                ) : (
                  <div className="h-[150px] w-[150px] rounded-2xl bg-neutral-100 dark:bg-white/10" />
                )}

                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#25D366] px-6 text-base font-semibold text-white transition hover:brightness-95"
                >
                  {t('sendPhoto')}
                </a>
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                {t('demoNote')}
              </p>

              <a
                href={origin ? `${origin}/gallery?code=${DEMO_CODE}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300"
              >
                {t('fullGallery')}
              </a>
            </div>

            {/* Live demo gallery */}
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#25D366]" />
                {t('liveGallery')}
              </div>
              <div className="[column-fill:_balance] columns-2 gap-2 sm:columns-3">
                {live.map((it) => (
                  <div
                    key={it.id}
                    className="mb-2 overflow-hidden rounded-xl ring-2 ring-brand-500/40"
                  >
                    {isVideo(it.mime) ? (
                      <video src={it.url} muted playsInline preload="metadata" className="h-auto w-full" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.url} alt="" className="h-auto w-full" />
                    )}
                  </div>
                ))}
                {SAMPLES.map((src) => (
                  <div key={src} className="mb-2 overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Sample" className="h-auto w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CONVERT ---------------- */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 text-center">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">
          {t('convertTitle')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 dark:text-neutral-300">
          {t('convertDesc')}
        </p>
        <a
          href="/register"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-brand-600 px-8 text-base font-semibold text-white transition hover:bg-brand-700"
        >
          {t('createAccount')}
        </a>
      </section>
    </main>
  );
}
