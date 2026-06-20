'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type AccessRequest = {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  quota_yearly: number | null;
  created_at: string;
  reviewed_at: string | null;
};

export default function AdminRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [quota, setQuota] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const getTokenOrRedirect = async () => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
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
      const res = await fetch('/api/admin/requests', { headers: { Authorization: `Bearer ${token}` } });
      const data = (await res.json()) as { requests: AccessRequest[] } | { error: string };
      if (!res.ok) throw new Error(('error' in data && data.error) || 'Failed to load requests');
      setRequests((data as { requests: AccessRequest[] }).requests);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'approve' && !confirm('Approve this request and create the photographer account?')) return;
    if (action === 'reject' && !confirm('Reject this request?')) return;

    setErr(null);
    setBusyId(id);
    const token = await getTokenOrRedirect();
    if (!token) return;
    try {
      const q = Number(quota[id] ?? '50');
      const res = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, quota_yearly: q }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Action failed');
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const statusPill = (s: AccessRequest['status']) => {
    const base = 'rounded-full border px-2.5 py-0.5 text-xs';
    if (s === 'pending') return `${base} border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300`;
    if (s === 'approved') return `${base} border-green-300 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300`;
    return `${base} border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300`;
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Requests</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Pending: <span className="font-semibold">{pendingCount}</span> · Total:{' '}
            <span className="font-semibold">{requests.length}</span>
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {err}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
          No requests yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((r) => {
            const isPending = r.status === 'pending';
            const busy = busyId === r.id;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-card dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {r.name}{' '}
                      <span className="ml-2 text-xs font-normal text-neutral-500">
                        <span className="font-mono">{r.email}</span>
                      </span>
                    </div>
                    {r.message && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">{r.message}</p>
                    )}
                    <div className="mt-2 text-xs text-neutral-500">
                      {new Date(r.created_at).toLocaleString()}
                      {r.quota_yearly ? ` · quota ${r.quota_yearly}` : ''}
                    </div>
                  </div>
                  <span className={statusPill(r.status)}>{r.status}</span>
                </div>

                {isPending && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-neutral-500">Quota</label>
                    <input
                      value={quota[r.id] ?? '50'}
                      onChange={(e) => setQuota((q) => ({ ...q, [r.id]: e.target.value }))}
                      inputMode="numeric"
                      className="h-9 w-20 rounded-lg border border-black/10 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-white/5"
                    />
                    <button
                      onClick={() => act(r.id, 'approve')}
                      disabled={busy}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                    >
                      {busy ? 'Working…' : 'Approve + create'}
                    </button>
                    <button
                      onClick={() => act(r.id, 'reject')}
                      disabled={busy}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
