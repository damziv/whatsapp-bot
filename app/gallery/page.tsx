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

  // lightbox state
  const [isOpen, setIsOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';

  useEffect(() => {
    setLoading(true);
    const qs = code ? `?code=${encodeURIComponent(code)}` : '';
    Promise.all([
      fetch(`/api/gallery${qs}`).then((r) => r.json()),
      code
        ? fetch(`/api/album?code=${encodeURIComponent(code)}`).then((r) => (r.ok ? r.json() : null))
        : Promise.resolve(null),
    ])
      .then(([g, m]) => {
        setItems((g?.items as Item[]) || []);
        setMeta(m as AlbumMeta | null);
      })
      .finally(() => setLoading(false));
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
    // prevent background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, items.length]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {meta?.label ? meta.label : code ? `Album (${code})` : 'Wedding Gallery'}
          </h1>
          {meta?.start_at && meta?.end_at && (
            <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
              Upload window: {new Date(meta.start_at).toLocaleString()} → {new Date(meta.end_at).toLocaleString()}
            </div>
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
          // Masonry via CSS columns
          <div className="[column-fill:_balance] columns-2 gap-2 sm:columns-3 sm:gap-3 md:columns-4">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                onClick={() => openAt(i)}
                className="mb-2 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl ring-1 ring-black/5 transition hover:shadow-card dark:ring-white/10"
                aria-label="Open image"
              >
                <Image
                  src={it.url}
                  alt=""
                  width={1200}
                  height={800}
                  unoptimized
                  className="h-auto w-full"
                  priority={false}
                />
              </button>
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

/* === Swipeable Lightbox (no deps) ======================================= */
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
    // prevent vertical scroll when swiping horizontally a lot
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy)) e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current || startX.current == null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX.current;
    const threshold = 50; // px
    if (dx <= -threshold) onNext();
    else if (dx >= threshold) onPrev();
    isDragging.current = false;
    startX.current = null;
    startY.current = null;
  };

  // click outside to close
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
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-card transition hover:bg-white"
      >
        ✕
      </button>

      {/* Prev / Next buttons */}
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

      {/* Image */}
      <div
        className="max-h-[90vh] max-w-[95vw] select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Use <img> for natural sizing in modal */}
        <img
          src={current.url}
          alt=""
          className="h-full max-h-[90vh] w-auto max-w-[95vw] rounded-2xl object-contain ring-1 ring-white/10"
        />
      </div>

      {/* Counter */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        {index + 1} / {items.length}
      </div>
    </div>
  );
}
