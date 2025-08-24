// app/dashboard/page.tsx
'use client';

import { useState } from 'react';

type CreatedAlbum = {
  type: 'bachelor' | 'bachelorette' | 'wedding';
  label: string;
  code: string;
  event_slug: string;
  album_slug: string;
  start_at: string;
  end_at: string;
  wa_link: string;
  share_link: string;
  gallery_link: string;
};

type SetupProfileResponse = {
  profile: { id: string; bride_name: string; groom_name: string };
  albums: CreatedAlbum[];
};

export default function Dashboard() {
  const [form, setForm] = useState({
    brideName: '',
    groomName: '',
    weddingDate: '',
    bachelorDate: '',
    bacheloretteDate: '',
    ownerEmail: ''
  });
  const [result, setResult] = useState<SetupProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch('/api/setup-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          bachelorDate: form.bachelorDate || null,
          bacheloretteDate: form.bacheloretteDate || null,
          ownerEmail: form.ownerEmail || null
        })
      });
      const data: SetupProfileResponse | { error: string } = await res.json();
      if (!res.ok) throw new Error(('error' in data && data.error) || 'Failed');
      setResult(data as SetupProfileResponse);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Create Wedding Profile</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="Bride name" value={form.brideName}
          onChange={e => setForm({ ...form, brideName: e.target.value })} required />
        <input placeholder="Groom name" value={form.groomName}
          onChange={e => setForm({ ...form, groomName: e.target.value })} required />
        <input placeholder="Owner email (optional)" value={form.ownerEmail}
          onChange={e => setForm({ ...form, ownerEmail: e.target.value })} />
        <label>Wedding date</label>
        <input type="date" value={form.weddingDate}
          onChange={e => setForm({ ...form, weddingDate: e.target.value })} required />
        <label>Bachelor date (optional)</label>
        <input type="date" value={form.bachelorDate}
          onChange={e => setForm({ ...form, bachelorDate: e.target.value })} />
        <label>Bachelorette date (optional)</label>
        <input type="date" value={form.bacheloretteDate}
          onChange={e => setForm({ ...form, bacheloretteDate: e.target.value })} />
        <button disabled={loading} type="submit">{loading ? 'Creating…' : 'Create & Get QR Links'}</button>
      </form>

      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {result && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Share these QR codes or links with guests:</h2>

          <div style={{ display: 'grid', gap: 16 }}>
            {result.albums.map((a: CreatedAlbum) => {
              const qrImg = `/api/qr?data=${encodeURIComponent(a.share_link)}`;

              const copy = async (text: string) => {
                try { await navigator.clipboard.writeText(text); alert('Copied!'); }
                catch { alert('Copy failed'); }
              };

              return (
                <div key={a.code} style={{ display: 'flex', gap: 16, alignItems: 'center', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                  <img src={qrImg} width={110} height={110} alt="QR" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{a.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                      Window: {new Date(a.start_at).toLocaleString()} → {new Date(a.end_at).toLocaleString()}
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <div>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>QR target: </span>
                        <a href={a.share_link} target="_blank" rel="noreferrer">{a.share_link}</a>
                        <button onClick={() => copy(a.share_link)} style={{ marginLeft: 8 }}>Copy</button>
                      </div>
                      <div>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>WhatsApp deep link: </span>
                        <a href={a.wa_link} target="_blank" rel="noreferrer">{a.wa_link}</a>
                        <button onClick={() => copy(a.wa_link)} style={{ marginLeft: 8 }}>Copy</button>
                      </div>
                      <div>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>Public gallery: </span>
                        <a href={a.gallery_link} target="_blank" rel="noreferrer">{a.gallery_link}</a>
                        <button onClick={() => copy(a.gallery_link)} style={{ marginLeft: 8 }}>Copy</button>
                      </div>
                      <div>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>Album code: </span>
                        <code>{a.code}</code>
                        <button onClick={() => copy(a.code)} style={{ marginLeft: 8 }}>Copy</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
