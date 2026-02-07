// app/portal/portal-client.tsx
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type PortalAlbum = {
  profile_id: string;
  bride_name: string | null;
  groom_name: string | null;
  event_date: string | null;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  code: string;
  created_at: string;
};

type PortalPayload = {
  photographer: {
    quota_yearly: number;
    period_start: string;
    period_end: string;
  };
  usage: { used: number; quota: number };
  albums: PortalAlbum[];
};

type CreatedAlbumResponse = {
  album: {
    code: string;
    bride_name: string;
    groom_name: string;
    event_date: string;
    start_at: string;
    end_at: string;
    is_active: boolean;
    share_link: string;
    gallery_link: string;
    owner_pin?: string; // only present if backend returns it
  };
};

export default function PortalClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<PortalPayload | null>(null);

  // Create form
  const [bride, setBride] = useState('');
  const [groom, setGroom] = useState('');
  const [date, setDate] = useState(''); // optional YYYY-MM-DD
  const [creating, setCreating] = useState(false);

  // Post-create modal
  const [created, setCreated] = useState<CreatedAlbumResponse['album'] | null>(null);

  // Reset-pin modal
  const [pinModal, setPinModal] = useState<{ code: string; pin: string } | null>(null);
  const [resettingCode, setResettingCode] = useState<string | null>(null);

  // Delete album state
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const usageText = useMemo(() => {
    if (!payload) return '';
    return `${payload.usage.used}/${payload.usage.quota}`;
  }, [payload]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied!');
    } catch {
      alert('Copy failed');
    }
  };

  const load = async () => {
    setErr(null);
    setLoading(true);

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch('/api/portal/albums', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as PortalPayload | { error: string };

      if (!res.ok) throw new Error(('error' in data && data.error) || 'Failed to load albums');
      setPayload(data as PortalPayload);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setCreating(true);
    setCreated(null);

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch('/api/portal/albums', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bride_name: bride.trim(),
          groom_name: groom.trim(),
          event_date: date ? date : undefined,
        }),
      });

      const out = (await res.json()) as CreatedAlbumResponse | { error: string };
      if (!res.ok) throw new Error(('error' in out && out.error) || 'Failed to create album');

      // reset form
      setBride('');
      setGroom('');
      setDate('');

      // show modal with owner PIN + links
      if ('album' in out) setCreated(out.album);

      // reload list + usage
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const resetPin = async (code: string) => {
    if (!confirm('Reset owner PIN? The old PIN will stop working.')) return;

    setErr(null);
    setResettingCode(code);

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch('/api/portal/albums/reset-pin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Failed to reset PIN');

      setPinModal({ code, pin: out.owner_pin });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setResettingCode(null);
    }
  };

  const deleteAlbum = async (code: string) => {
    if (!confirm('Delete this album? Photos will be deleted too. This is only allowed within 24 hours of creation.')) return;

    setErr(null);
    setDeletingCode(code);

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch('/api/portal/albums', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Failed to delete album');

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingCode(null);
    }
  };

  const statusLabel = (a: PortalAlbum) => {
    const now = Date.now();
    const start = a.start_at ? new Date(a.start_at).getTime() : null;
    const end = a.end_at ? new Date(a.end_at).getTime() : null;

    if (!a.is_active) return 'Inactive';
    if (start && now < start) return 'Scheduled';
    if (end && now > end) return 'Closed';
    return 'Open';
  };

  const statusPillClass = () => {
    return 'rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-neutral-700 dark:border-white/10 dark:text-neutral-300';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading…</p>
          </div>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <p className="text-sm" role="alert" aria-live="assertive">
              {err}
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const albums = payload?.albums ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">Portal</h1>
            {payload && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Albums used: <span className="font-semibold">{usageText}</span> · Period:{' '}
                {new Date(payload.photographer.period_start).toLocaleDateString()} →{' '}
                {new Date(payload.photographer.period_end).toLocaleDateString()}
              </p>
            )}
          </div>

          <button
            onClick={signOut}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </div>

        {/* Create album */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">Create new album</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            One client = one QR code. Guests upload via WhatsApp.
          </p>

          <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              placeholder="Bride name"
              value={bride}
              onChange={(e) => setBride(e.target.value)}
              required
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />
            <input
              placeholder="Groom name"
              value={groom}
              onChange={(e) => setGroom(e.target.value)}
              required
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
            />

            <div className="sm:col-span-3">
              <button
                disabled={creating || (payload ? payload.usage.used >= payload.usage.quota : false)}
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Create album & get QR'}
              </button>

              {payload && payload.usage.used >= payload.usage.quota && (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                  You reached your quota for this period.
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Albums list */}
        <div className="mt-6 grid gap-4">
          {albums.length === 0 && (
            <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
              No albums yet. Create your first album above.
            </div>
          )}

          {albums.map((a) => {
            const shareLink = `/w?code=${encodeURIComponent(a.code)}`;
            const galleryLink = `/gallery?code=${encodeURIComponent(a.code)}`;
            const manageLink = `/gallery/manage?code=${encodeURIComponent(a.code)}`;
            const qrImg = `/api/qr?data=${encodeURIComponent(window.location.origin + shareLink)}`;

            const status = statusLabel(a);

            const createdAtMs = new Date(a.created_at).getTime();
            const canDelete = Date.now() - createdAtMs < 24 * 60 * 60 * 1000;

            return (
              <div
                key={a.code}
                className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-card dark:border-white/10 dark:bg-white/5"
              >
                <div className="shrink-0">
                  <Image
                    src={qrImg}
                    alt="QR"
                    width={110}
                    height={110}
                    unoptimized
                    className="rounded-xl ring-1 ring-black/5 dark:ring-white/10"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="font-semibold truncate">
                      {(a.bride_name || 'Bride')} &amp; {(a.groom_name || 'Groom')}
                    </div>
                    <span className={statusPillClass()}>{status}</span>
                    <span className="text-xs text-neutral-500">
                      Code: <span className="font-mono">{a.code}</span>
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                    Window:{' '}
                    {a.start_at ? new Date(a.start_at).toLocaleString() : 'N/A'} →{' '}
                    {a.end_at ? new Date(a.end_at).toLocaleString() : 'N/A'}
                    {a.event_date ? (
                      <>
                        {' '}
                        · Date: <span className="font-medium">{new Date(a.event_date).toLocaleDateString()}</span>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="truncate">
                      <span className="text-xs text-neutral-500">Guest QR target: </span>
                      <a
                        href={shareLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300"
                      >
                        {shareLink}
                      </a>
                      <button
                        onClick={() => copy(window.location.origin + shareLink)}
                        className="ml-2 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        Copy
                      </button>
                    </div>

                    <div className="truncate">
                      <span className="text-xs text-neutral-500">Public gallery: </span>
                      <a
                        href={galleryLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300"
                      >
                        {galleryLink}
                      </a>
                      <button
                        onClick={() => copy(window.location.origin + galleryLink)}
                        className="ml-2 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        Copy
                      </button>
                    </div>

                    <div className="truncate">
                      <span className="text-xs text-neutral-500">Owner manage: </span>
                      <a
                        href={manageLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300"
                      >
                        {manageLink}
                      </a>
                      <button
                        onClick={() => copy(window.location.origin + manageLink)}
                        className="ml-2 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        Copy
                      </button>
                    </div>

                    <div className="truncate">
                      <span className="text-xs text-neutral-500">Album code: </span>
                      <code className="rounded-md bg-black/5 px-1.5 py-0.5 text-[12px] dark:bg-white/10">
                        {a.code}
                      </code>
                      <button
                        onClick={() => copy(a.code)}
                        className="ml-2 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        Copy
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => resetPin(a.code)}
                        disabled={resettingCode === a.code}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        {resettingCode === a.code ? 'Resetting…' : 'Reset owner PIN'}
                      </button>

                      {canDelete && (
                        <button
                          onClick={() => deleteAlbum(a.code)}
                          disabled={deletingCode === a.code}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
                          title="Delete is allowed within 24 hours of creation"
                        >
                          {deletingCode === a.code ? 'Deleting…' : 'Delete (24h)'}
                        </button>
                      )}
                    </div>

                    {!canDelete && (
                      <div className="text-xs text-neutral-500">
                        Delete is only available within 24 hours of creation.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Post-create modal (Owner PIN) */}
      {created && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-card dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Album created</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  Share the QR with guests. Give the PIN to the couple (owner) to manage the gallery.
                </p>
              </div>

              <button
                onClick={() => setCreated(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="shrink-0">
                <Image
                  src={`/api/qr?data=${encodeURIComponent(created.share_link)}`}
                  alt="QR"
                  width={130}
                  height={130}
                  unoptimized
                  className="rounded-xl ring-1 ring-black/5 dark:ring-white/10"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="text-sm">
                  <div className="text-xs text-neutral-500">Guest QR target</div>
                  <div className="truncate font-medium">{created.share_link}</div>
                  <button
                    onClick={() => copy(created.share_link)}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Copy
                  </button>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-neutral-500">Public gallery</div>
                  <div className="truncate font-medium">{created.gallery_link}</div>
                  <button
                    onClick={() => copy(created.gallery_link)}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Copy
                  </button>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-neutral-500">Album code</div>
                  <div className="font-mono text-sm">{created.code}</div>
                  <button
                    onClick={() => copy(created.code)}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Copy
                  </button>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-neutral-500">Owner PIN</div>
                  <div className="font-mono text-lg font-semibold tracking-widest">
                    {created.owner_pin ?? '—'}
                  </div>
                  <button
                    onClick={() => created.owner_pin && copy(created.owner_pin)}
                    disabled={!created.owner_pin}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setCreated(null)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN modal */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-card dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">New owner PIN</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  Album: <span className="font-mono">{pinModal.code}</span>
                </p>
              </div>

              <button
                onClick={() => setPinModal(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/10">
              <div className="text-xs text-neutral-500">Owner PIN</div>
              <div className="mt-1 font-mono text-2xl font-semibold tracking-widest">{pinModal.pin}</div>

              <button
                onClick={() => copy(pinModal.pin)}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Copy PIN
              </button>
            </div>

            <p className="mt-3 text-xs text-neutral-500">The old PIN no longer works.</p>
          </div>
        </div>
      )}
    </main>
  );
}
