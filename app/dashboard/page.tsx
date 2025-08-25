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
          ownerEmail: form.ownerEmail
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
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">💍</div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Create Wedding Profile</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Fill in all required fields. We’ll generate deep links, QR codes and a public gallery per album.
          </p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          <form onSubmit={onSubmit} className="grid gap-3">
            <input
              placeholder="Bride name"
              value={form.brideName}
              onChange={e => setForm({ ...form, brideName: e.target.value })}
              required
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />
            <input
              placeholder="Groom name"
              value={form.groomName}
              onChange={e => setForm({ ...form, groomName: e.target.value })}
              required
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />
            <input
              placeholder="Owner email"
              value={form.ownerEmail}
              onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
              required
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />

            <label className="mt-1 text-sm font-medium">Wedding date</label>
            <input
              type="date"
              value={form.weddingDate}
              onChange={e => setForm({ ...form, weddingDate: e.target.value })}
              required
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />

            <label className="mt-1 text-sm font-medium">Bachelor date (optional)</label>
            <input
              type="date"
              value={form.bachelorDate}
              onChange={e => setForm({ ...form, bachelorDate: e.target.value })}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />

            <label className="mt-1 text-sm font-medium">Bachelorette date (optional)</label>
            <input
              type="date"
              value={form.bacheloretteDate}
              onChange={e => setForm({ ...form, bacheloretteDate: e.target.value })}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />

            <button
              disabled={loading}
              type="submit"
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create & Get QR Links'}
            </button>
          </form>

          {err && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
              {err}
            </p>
          )}
        </div>

        {result && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold tracking-[-0.01em]">Share these QR codes or links with guests:</h2>

            <div className="grid gap-4">
              {result.albums.map((a: CreatedAlbum) => {
                const qrImg = `/api/qr?data=${encodeURIComponent(a.share_link)}`;

                const copy = async (text: string) => {
                  try { await navigator.clipboard.writeText(text); alert('Copied!'); }
                  catch { alert('Copy failed'); }
                };

                return (
                  <div
                    key={a.code}
                    className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-card dark:border-white/10 dark:bg-white/5"
                  >
                    <img src={qrImg} width={110} height={110} alt="QR" className="rounded-xl ring-1 ring-black/5 dark:ring-white/10" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{a.label}</div>
                      <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                        Window: {new Date(a.start_at).toLocaleString()} → {new Date(a.end_at).toLocaleString()}
                      </div>

                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="truncate">
                          <span className="text-xs text-neutral-500">QR target: </span>
                          <a
                            href={a.share_link}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300"
                          >
                            {a.share_link}
                          </a>
                          <button
                            onClick={() => copy(a.share_link)}
                            className="ml-2 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            Copy
                          </button>
                        </div>

                        <div className="truncate">
                          <span className="text-xs text-neutral-500">WhatsApp deep link: </span>
                          <a
                            href={a.wa_link}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300"
                          >
                            {a.wa_link}
                          </a>
                          <button
                            onClick={() => copy(a.wa_link)}
                            className="ml-2 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            Copy
                          </button>
                        </div>

                        <div className="truncate">
                          <span className="text-xs text-neutral-500">Public gallery: </span>
                          <a
                            href={a.gallery_link}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300"
                          >
                            {a.gallery_link}
                          </a>
                          <button
                            onClick={() => copy(a.gallery_link)}
                            className="ml-2 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            Copy
                          </button>
                        </div>

                        <div className="truncate">
                          <span className="text-xs text-neutral-500">Album code: </span>
                          <code className="rounded-md bg-black/5 px-1.5 py-0.5 text-[12px] dark:bg-white/10">{a.code}</code>
                          <button
                            onClick={() => copy(a.code)}
                            className="ml-2 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
