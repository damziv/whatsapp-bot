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

export default function PortalAlbumsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<PortalPayload | null>(null);

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

  const getTokenOrRedirect = async () => {
    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = '/login';
      return null;
    }
    return token;
  };

  const load = async () => {
    setErr(null);
    setLoading(true);

    const token = await getTokenOrRedirect();
    if (!token) return;

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

  const resetPin = async (code: string) => {
    if (!confirm('Reset owner PIN? The old PIN will stop working.')) return;

    setErr(null);
    setResettingCode(code);

    const token = await getTokenOrRedirect();
    if (!token) return;

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
    if (
      !confirm(
        'Delete this album? Photos will be deleted too.\n\nThis is only allowed within 24 hours of creation.'
      )
    )
      return;

    setErr(null);
    setDeletingCode(code);

    const token = await getTokenOrRedirect();
    if (!token) return;

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

  const statusPillClass = () =>
    'rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-neutral-700 dark:border-white/10 dark:text-neutral-300';

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
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
    );
  }

  const albums = payload?.albums ?? [];

  return (
    <>
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">Albums</h1>
            {payload && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Albums used: <span className="font-semibold">{usageText}</span> · Period:{' '}
                {new Date(payload.photographer.period_start).toLocaleDateString()} →{' '}
                {new Date(payload.photographer.period_end).toLocaleDateString()}
              </p>
            )}
          </div>

          <button
            onClick={load}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {/* Empty */}
        {albums.length === 0 && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            No albums yet. Go to <span className="font-semibold">Create album</span> in the menu.
          </div>
        )}

        {/* List */}
        <div className="grid gap-4">
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
                {/* QR */}
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

                {/* Info */}
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
                    {/* Guest QR */}
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

                    {/* Public gallery */}
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

                    {/* Owner manage */}
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

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => resetPin(a.code)}
                        disabled={resettingCode === a.code}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        {resettingCode === a.code ? 'Resetting…' : 'Reset owner PIN'}
                      </button>

                      {canDelete ? (
                        <button
                          onClick={() => deleteAlbum(a.code)}
                          disabled={deletingCode === a.code}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
                          title="Delete is allowed within 24 hours of creation"
                        >
                          {deletingCode === a.code ? 'Deleting…' : 'Delete (24h)'}
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-500">Delete disabled (24h passed)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
    </>
  );
}
