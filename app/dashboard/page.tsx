'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [form, setForm] = useState({
    brideName: '',
    groomName: '',
    weddingDate: '',
    bachelorDate: '',
    bacheloretteDate: '',
    ownerEmail: ''
  });
  const [result, setResult] = useState<any>(null);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (e: any) {
      setErr(e.message || 'Failed');
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
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Share these links (put into QR):</h2>
          <ul>
            {result.albums.map((a: any) => (
              <li key={a.code} style={{ marginBottom: 6 }}>
                <strong style={{ textTransform: 'capitalize' }}>{a.type}</strong>: {a.wa_link}
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Code: {a.code} · Window: {new Date(a.start_at).toLocaleString()} → {new Date(a.end_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
          {/* You can render QR with a lib like 'react-qr-code', but plain links are OK for now */}
        </section>
      )}
    </main>
  );
}
