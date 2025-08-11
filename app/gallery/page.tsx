'use client';

import { useEffect, useState } from 'react';

type Item = { id: string; url: string; created_at: string; mime?: string | null };

export default function GalleryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gallery')
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Wedding Gallery</h1>
      {loading && <p>Loading…</p>}
      {!loading && items.length === 0 && <p>No photos yet.</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 8,
        }}
      >
        {items.map((it) => (
          <a key={it.id} href={it.url} target="_blank" rel="noreferrer">
            {/* If you later allow videos, you can branch on mime.startsWith('video/') */}
            <img
              src={it.url}
              alt=""
              style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }}
            />
          </a>
        ))}
      </div>
    </main>
  );
}
