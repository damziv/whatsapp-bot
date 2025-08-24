// app/gallery/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

type Item = { id: string; url: string; created_at: string; mime?: string | null };

export default function GalleryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ label?: string; start_at?: string | null; end_at?: string | null } | null>(null);

  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';

  useEffect(() => {
    setLoading(true);
    const qs = code ? `?code=${encodeURIComponent(code)}` : '';
    Promise.all([
      fetch(`/api/gallery${qs}`).then(r => r.json()),
      code ? fetch(`/api/album?code=${encodeURIComponent(code)}`).then(r => r.ok ? r.json() : null) : Promise.resolve(null)
    ])
      .then(([g, m]) => {
        setItems(g.items || []);
        setMeta(m);
      })
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
        {meta?.label ? meta.label : code ? `Album (${code})` : 'Wedding Gallery'}
      </h1>
      {meta?.start_at && meta?.end_at && (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
          Upload window: {new Date(meta.start_at).toLocaleString()} → {new Date(meta.end_at).toLocaleString()}
        </div>
      )}

      {loading && <p>Loading…</p>}
      {!loading && items.length === 0 && <p>No photos yet{code ? ' for this album.' : '.'}</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 8,
        }}
      >
        {items.map((it) => (
          <a key={it.id} href={it.url} target="_blank" rel="noreferrer">
            <Image
              src={it.url}
              alt=""
              width={400}
              height={300}
              style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }}
              unoptimized
              priority={false}
            />
          </a>
        ))}
      </div>
    </main>
  );
}
