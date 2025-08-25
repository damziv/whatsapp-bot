// app/gallery/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
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
            {items.map((it) => (
              <a
                key={it.id}
                href={it.url}
                target="_blank"
                rel="noreferrer"
                className="mb-2 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl ring-1 ring-black/5 transition hover:shadow-card dark:ring-white/10"
              >
                {/* Next/Image needs width/height; let it scale naturally */}
                <Image
                  src={it.url}
                  alt=""
                  width={1200}
                  height={800}
                  unoptimized
                  className="h-auto w-full"
                  priority={false}
                />
              </a>
            ))}
          </div>
        )}
      </div>
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
