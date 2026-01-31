'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

type Item = { id: string; url: string; created_at: string; mime?: string | null };
type AlbumMeta = { label?: string; start_at?: string | null; end_at?: string | null; is_active?: boolean };

const LS_TOKEN_KEY = (code: string) => `owner_token_${code}`;

export default function ManagePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ManageInner />
    </Suspense>
  );
}

function ManageInner() {
  const sp = useSearchParams();
  const code = (sp.get('code') || '').toUpperCase();

  const [pin, setPin] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const [meta, setMeta] = useState<AlbumMeta | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinLoading, setPinLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // lightbox state
  const [isOpen, setIsOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const title = useMemo(() => {
    if (!code) return 'Manage Gallery';
    return meta?.label ? `Manage: ${meta.label}` : `Manage Album (${code})`;
  }, [code, meta?.label]);

  // load any stored token
  useEffect(() => {
    if (!code) return;
    const t = localStorage.getItem(LS_TOKEN_KEY(code));
    if (t) setToken(t);
  }, [code]);

  const loadGallery = async () => {
    if (!code) return;
    setLoading(true);
    setErr(null);
    try {
      const qs = `?code=${encodeURIComponent(code)}`;
      const [g, m] = await Promise.all([
        fetch(`/api/gallery${qs}`).then((r) => r.json()),
        fetch(`/api/album?code=${encodeURIComponent(code)}`).then((r) => (r.ok ? r.json() : null)),
      ]);
      setItems((g?.items as Item[]) || []);
      setMeta(m as AlbumMeta | null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setPinLoading(true);
    setErr(null);

    try {
      const res = await fetch('/api/owner/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Invalid PIN');

      localStorage.setItem(LS_TOKEN_KEY(code), out.token);
      setToken(out.token);
      setPin('');
    } catch (e: any) {
      setErr(e?.message || 'PIN failed');
    } finally {
      setPinLoading(false);
    }
  };

  const signOutOwner = () => {
    if (!code) return;
    localStorage.removeItem(LS_TOKEN_KEY(code));
    setToken(null);
    setIsOpen(false);
  };

  const deletePhoto = async (id: string) => {
    if (!token) {
      setErr('Enter PIN first');
      return;
    }
    if (!confirm('Delete this photo? This cannot be undone.')) return;

    setErr(null);
    try {
      const res = await fetch(`/api/owner/media/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Delete failed');

      setItems((prev) => {
        const next = prev.filter((x) => x.id !== id);
        // keep idx valid if lightbox open
        if (isOpen) {
          const newIdx = Math.min(idx, Math.max(0, next.length - 1));
          setIdx(newIdx);
          if (next.length === 0) setIsOpen(false);
        }
        return next;
      });
    } catch (e: any) {
      setErr(e?.message || 'Delete failed');
    }
  };

  const downloadAllZip = async () => {
    if (!token) {
      setErr('Enter PIN first');
      return;
    }
    setErr(null);
    setDownloading(true);
    try {
      const res = await fetch(`/api/owner/download?code=${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        throw new Error((out as any)?.error || 'Download failed');
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
    } catch (e: any) {
      setErr(e?.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  // open lightbox
  const openAt = (i: number) => {
    setIdx(i);
    setIsOpen(true);
  };

  if (!code) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            Missing album code.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
            {meta?.start_at && meta?.end_at && (
              <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                Upload window: {new Date(meta.start_at).toLocaleString()} → {new Date(meta.end_at).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {token && items.length > 0 && (
              <button
                onClick={downloadAllZip}
                disabled={downloading}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {downloading ? 'Preparing…' : 'Download all (.zip)'}
              </button>
            )}

            {token ? (
              <button
                onClick={signOutOwner}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Lock
              </button>
            ) : null}
          </div>
        </header>

        {!token && (
          <div className="mb-6 rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
            <h2 className="text-lg font-semibold">Enter owner PIN</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              This PIN was provided by your photographer to manage the gallery (delete photos + download all).
            </p>

            <form onSubmit={submitPin} className="mt-4 flex flex-wrap gap-3">
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                inputMode="numeric"
                placeholder="6-digit PIN"
                className="h-11 w-44 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
                required
              />
              <button
                disabled={pinLoading}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {pinLoading ? 'Checking…' : 'Unlock'}
              </button>
            </form>
          </div>
        )}

        {err && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {err}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            Loading…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            No photos yet.
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="[column-fill:_balance] columns-2 gap-2 sm:columns-3 sm:gap-3 md:columns-4">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                onClick={() => openAt(i)}
                className="mb-2 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl ring-1 ring-black/5 transition hover:shadow-card dark:ring-white/10"
                aria-label="Open image"
              >
                <Image src={it.url} alt="" width={1200} height={800} unoptimized className="h-auto w-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isOpen && items.length > 0 && (
        <OwnerLightbox
          items={items}
          index={idx}
          canManage={!!token}
          onClose={() => setIsOpen(false)}
          onPrev={() => setIdx((p) => (p - 1 + items.length) % items.length)}
          onNext={() => setIdx((p) => (p + 1) % items.length)}
          onDelete={() => deletePhoto(items[idx].id)}
        />
      )}
    </main>
  );
}

function Skeleton() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
          Loading…
        </div>
      </div>
    </main>
  );
}

/* === Swipeable Lightbox (with delete) ===================================== */
function OwnerLightbox({
  items,
  index,
  canManage,
  onClose,
  onPrev,
  onNext,
  onDelete,
}: {
  items: { id: string; url: string }[];
  index: number;
  canManage: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDelete: () => void;
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
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-card transition hover:bg-white"
      >
        ✕
      </button>

      {/* Delete */}
      {canManage && (
        <button
          onClick={onDelete}
          aria-label="Delete"
          className="absolute left-4 top-4 inline-flex h-10 items-center justify-center rounded-full bg-red-600 px-4 text-sm font-semibold text-white shadow-card transition hover:bg-red-700"
        >
          Delete
        </button>
      )}

      {/* Prev / Next */}
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
