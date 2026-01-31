// app/gallery/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type Item = { id: string; url: string; created_at: string; mime?: string | null };
type AlbumMeta = { label?: string; start_at?: string | null; end_at?: string | null };

export default function GalleryPage() {
  return (
    <Suspense fallback={<GallerySkeleton />}>
      <GalleryInner />
    </Suspense>
  );
}

function GalleryInner() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<AlbumMeta | null>(null);

  // owner mode
  const [isOwner, setIsOwner] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // lightbox state
  const [isOpen, setIsOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';

  const reload = async () => {
    setLoading(true);
    const qs = code ? `?code=${encodeURIComponent(code)}` : '';
    const [g, m] = await Promise.all([
      fetch(`/api/gallery${qs}`).then((r) => r.json()),
      code ? fetch(`/api/album?code=${encodeURIComponent(code)}`).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null),
    ]);
    setItems((g?.items as Item[]) || []);
    setMeta(m as AlbumMeta | null);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // open lightbox
  const openAt = (i: number) => {
    setIdx(i);
    setIsOpen(true);
  };

  // keyboard navigation
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
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Invalid PIN');
      setIsOwner(true);
      setPinOpen(false);
      setPin('');
    } catch (e: any) {
      setPinErr(e?.message || 'Invalid PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const deleteItem = async (media_id: string) => {
    if (!confirm('Delete this photo?')) return;
    const res = await fetch('/api/owner/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_id, code }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(out?.error || 'Delete failed');
      return;
    }
    await reload();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
              {meta?.label ? meta.label : code ? `Album (${code})` : 'Wedding Gallery'}
            </h1>
            {meta?.start_at && meta?.end_at && (
              <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                Upload window: {new Date(meta.start_at).toLocaleString()} → {new Date(meta.end_at).toLocaleString()}
              </div>
            )}
          </div>

          {code && (
            <button
              onClick={() => setPinOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {isOwner ? 'Owner mode ✓' : 'Manage gallery'}
            </button>
          )}
        </header>

        {loading && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            Loading…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            No photos yet{code ? ' for this album.' : '.'}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="[column-fill:_balance] columns-2 gap-2 sm:columns-3 sm:gap-3 md:columns-4">
            {items.map((it, i) => (
              <div key={it.id} className="mb-2 break-inside-avoid">
                <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                  <button
                    type="button"
                    onClick={() => openAt(i)}
                    className="block w-full"
                    aria-label="Open image"
                  >
                    <Image src={it.url} alt="" width={1200} height={800} unoptimized className="h-auto w-full" />
                  </button>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => deleteItem(it.id)}
                      className="absolute right-2 top-2 inline-flex h-9 items-center justify-center rounded-xl bg-white/90 px-3 text-xs font-semibold text-neutral-900 shadow-card transition hover:bg-white"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
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
              <h2 className="text-lg font-semibold">Owner access</h2>
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
              Enter the PIN from your photographer to delete or download photos.
            </p>

            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              placeholder="6-digit PIN"
              className="mt-4 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />

            {pinErr && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{pinErr}</p>}

            <button
              onClick={loginOwner}
              disabled={pinLoading}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {pinLoading ? 'Checking…' : 'Unlock'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function GallerySkeleton() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="mb-3 text-2xl font-semibold tracking-[-0.02em]">Wedding Gallery</h1>
        <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
          Loading…
        </div>
      </div>
    </main>
  );
}

/* === Lightbox (unchanged) ======================================= */
function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: { id: string; url: string }[];
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
        <img
          src={current.url}
          alt=""
          className="h-full max-h-[90vh] w-auto max-w-[95vw] rounded-2xl object-contain ring-1 ring-white/10"
        />
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        {index + 1} / {items.length}
      </div>
    </div>
  );
}
