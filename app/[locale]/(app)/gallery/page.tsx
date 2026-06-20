// app/gallery/page.tsx
'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type Item = { id: string; url: string; created_at: string; mime?: string | null };
type AlbumMeta = {
  label?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  bride_name?: string | null;
  groom_name?: string | null;
};

function isVideoMime(m?: string | null) {
  return !!m && m.toLowerCase().startsWith('video/');
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<GallerySkeleton />}>
      <GalleryInner />
    </Suspense>
  );
}

function GalleryInner() {
  const t = useTranslations('Gallery');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<AlbumMeta | null>(null);

  // owner mode (Bearer-token auth, shared with /gallery/manage)
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const isOwner = !!ownerToken;
  const [downloading, setDownloading] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // lightbox state
  const [isOpen, setIsOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';

  // Restore a previously unlocked owner session for this album
  useEffect(() => {
    if (!code) return;
    const t = localStorage.getItem(`owner_token_${code}`);
    if (t) setOwnerToken(t);
  }, [code]);

  const reload = useCallback(async () => {
    // Without a code there is no album to show — never load the whole library.
    if (!code) {
      setItems([]);
      setMeta(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const qs = `?code=${encodeURIComponent(code)}`;
    const [g, m] = await Promise.all([
      fetch(`/api/gallery${qs}`).then((r) => r.json()),
      fetch(`/api/albums?code=${encodeURIComponent(code)}`).then((r) => (r.ok ? r.json() : null)),
    ]);

    setItems((g?.items as Item[]) || []);
    setMeta(m as AlbumMeta | null);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openAt = (i: number) => {
    setIdx(i);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
      if (e.key === 'ArrowRight') setIdx((p) => (p + 1) % items.length);
      if (e.key === 'ArrowLeft') setIdx((p) => (p - 1 + items.length) % items.length);
    };

    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, items.length]);

  const loginOwner = async () => {
    setPinErr(null);
    setPinLoading(true);

    try {
      const res = await fetch('/api/owner/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin }),
      });

      const out: unknown = await res.json();
      const errMsg =
        typeof out === 'object' && out !== null && 'error' in out && typeof (out as { error?: unknown }).error === 'string'
          ? (out as { error: string }).error
          : t('invalidPin');

      if (!res.ok) throw new Error(errMsg);

      const token =
        typeof out === 'object' && out !== null && 'token' in out && typeof (out as { token?: unknown }).token === 'string'
          ? (out as { token: string }).token
          : null;
      if (!token) throw new Error(t('invalidPin'));

      localStorage.setItem(`owner_token_${code}`, token);
      setOwnerToken(token);
      setPinOpen(false);
      setPin('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('invalidPin');
      setPinErr(message);
    } finally {
      setPinLoading(false);
    }
  };

  const lockOwner = () => {
    if (code) localStorage.removeItem(`owner_token_${code}`);
    setOwnerToken(null);
  };

  const deleteItem = async (media_id: string) => {
    if (!ownerToken) return;
    if (!confirm(t('deleteConfirm'))) return;

    const res = await fetch(`/api/owner/media/${encodeURIComponent(media_id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    const out: unknown = await res.json().catch(() => ({} as unknown));

    const errMsg =
      typeof out === 'object' && out !== null && 'error' in out && typeof (out as { error?: unknown }).error === 'string'
        ? (out as { error: string }).error
        : t('deleteFailed');

    if (!res.ok) {
      alert(errMsg);
      return;
    }

    await reload();
  };

  const downloadAll = async () => {
    if (!ownerToken) return;
    if (!confirm(t('downloadDeleteWarning'))) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/owner/download?code=${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        throw new Error((out as { error?: string })?.error || t('downloadFailed'));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `album_${code}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // ZIP saved on their device → schedule deletion 24h from now, then inform them.
      await fetch('/api/owner/schedule-purge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }).catch(() => {});
      alert(t('purgeScheduled'));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t('downloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  const coupleTitle =
  meta?.bride_name || meta?.groom_name
    ? `${meta?.bride_name || t('bride')} & ${meta?.groom_name || t('groom')}`
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {coupleTitle ?? meta?.label ?? (code ? t('albumFallback', { code }) : t('weddingGallery'))}
            </h1>
            {meta?.start_at && meta?.end_at && (
              <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                {t('allowedTime')}: {new Date(meta.start_at).toLocaleString()} → {new Date(meta.end_at).toLocaleString()}
              </div>
            )}
          </div>

          {code && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isOwner ? (
                <>
                  {items.length > 0 && (
                    <button
                      onClick={downloadAll}
                      disabled={downloading}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                    >
                      {downloading ? t('preparing') : t('downloadAll')}
                    </button>
                  )}
                  <button
                    onClick={lockOwner}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    {t('lock')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setPinOpen(true)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  {t('manageGalleryBtn')}
                </button>
              )}
            </div>
          )}
        </header>

        {loading && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            {t('loading')}
          </div>
        )}

        {!loading && !code && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            {t('missingCode')}
          </div>
        )}

        {!loading && code && items.length === 0 && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            {t('noPhotos')}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="[column-fill:_balance] columns-2 gap-2 sm:columns-3 sm:gap-3 md:columns-4">
            {items.map((it, i) => {
              const video = isVideoMime(it.mime);

              return (
                <div key={it.id} className="mb-2 break-inside-avoid">
                  <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                    <button type="button" onClick={() => openAt(i)} className="block w-full" aria-label="Open">
                      {video ? (
                        <div className="relative">
                          <video
                            src={it.url}
                            playsInline
                            muted
                            preload="metadata"
                            className="h-auto w-full"
                          />
                          <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-xs text-white">
                            ▶ Video
                          </div>
                        </div>
                      ) : (
                        <Image src={it.url} alt="" width={1200} height={800} unoptimized className="h-auto w-full" />
                      )}
                    </button>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => deleteItem(it.id)}
                        className="absolute right-2 top-2 inline-flex h-9 items-center justify-center rounded-xl bg-white/90 px-3 text-xs font-semibold text-neutral-900 shadow-card transition hover:bg-white"
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isOpen && items.length > 0 && (
        <Lightbox
          items={items}
          index={idx}
          onClose={() => setIsOpen(false)}
          onPrev={() => setIdx((p) => (p - 1 + items.length) % items.length)}
          onNext={() => setIdx((p) => (p + 1) % items.length)}
        />
      )}

      {/* PIN modal */}
      {pinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-card dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('ownerAccessTitle')}</h2>
              <button
                onClick={() => {
                  setPinOpen(false);
                  setPinErr(null);
                  setPin('');
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {t('ownerPinHelp')}
            </p>

            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              placeholder={t('pinPlaceholder')}
              className="mt-4 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />

            {pinErr && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{pinErr}</p>}

            <button
              onClick={loginOwner}
              disabled={pinLoading}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {pinLoading ? t('checking') : t('unlock')}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function GallerySkeleton() {
  const t = useTranslations('Gallery');
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="mb-3 text-2xl font-semibold tracking-[-0.02em]">{t('skeletonTitle')}</h1>
        <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
          {t('loading')}
        </div>
      </div>
    </main>
  );
}

/* === Lightbox ======================================================= */
function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: { id: string; url: string; mime?: string | null }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || startX.current == null || startY.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy)) e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current || startX.current == null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX.current;
    const threshold = 50;
    if (dx <= -threshold) onNext();
    else if (dx >= threshold) onPrev();
    isDragging.current = false;
    startX.current = null;
    startY.current = null;
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === wrapRef.current) onClose();
  };

  const current = items[index];
  const video = isVideoMime(current.mime);

  return (
    <div
      ref={wrapRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      aria-modal="true"
      role="dialog"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-card transition hover:bg-white"
      >
        ✕
      </button>

      <button
        onClick={onPrev}
        aria-label="Previous"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-3 text-neutral-900 shadow-card transition hover:bg-white sm:left-4"
      >
        ‹
      </button>
      <button
        onClick={onNext}
        aria-label="Next"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-3 text-neutral-900 shadow-card transition hover:bg-white sm:right-4"
      >
        ›
      </button>

      <div
        className="max-h-[90vh] max-w-[95vw] select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {video ? (
          <video
            src={current.url}
            controls
            playsInline
            preload="metadata"
            className="h-full max-h-[90vh] w-auto max-w-[95vw] rounded-2xl object-contain ring-1 ring-white/10"
          />
        ) : (
          <Image
            src={current.url}
            alt=""
            width={2000}
            height={2000}
            unoptimized
            className="h-full max-h-[90vh] w-auto max-w-[95vw] rounded-2xl object-contain ring-1 ring-white/10"
          />
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        {index + 1} / {items.length}
      </div>
    </div>
  );
}
