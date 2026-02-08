'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type AdminPhotographer = {
  id: string;
  user_id: string;
  email: string | null;
  company_name: string | null;
  quota_yearly: number;
  period_start: string; // date
  period_end: string; // date
  is_active: boolean;
  created_at: string;
};

type Payload = { photographers: AdminPhotographer[] };

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);

  // create form
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [quota, setQuota] = useState('50');
  const [creating, setCreating] = useState(false);

  // row editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCompany, setEditCompany] = useState('');
  const [editQuota, setEditQuota] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resettingPeriodId, setResettingPeriodId] = useState<string | null>(null);

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
      const res = await fetch('/api/admin/photographers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await res.json()) as Payload | { error: string };
      if (!res.ok) throw new Error(('error' in data && data.error) || 'Failed to load photographers');
      setPayload(data as Payload);
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

  const list = payload?.photographers ?? [];
  const activeCount = useMemo(() => list.filter((p) => p.is_active).length, [list]);

  const create = async () => {
    setErr(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setErr('Please enter a valid email.');
      return;
    }

    const q = Number(quota);
    if (!Number.isFinite(q) || q <= 0) {
      setErr('Quota must be a positive number.');
      return;
    }

    setCreating(true);
    const token = await getTokenOrRedirect();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/photographers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          company_name: company.trim() || null,
          quota_yearly: q,
        }),
      });

      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Failed to create photographer');

      setEmail('');
      setCompany('');
      setQuota('50');
      await load();
      alert('Invite sent! Photographer will receive a magic link email.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: AdminPhotographer) => {
    setErr(null);
    setEditingId(p.id);
    setEditCompany(p.company_name || '');
    setEditQuota(String(p.quota_yearly));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCompany('');
    setEditQuota('');
  };

  const saveEdit = async (id: string) => {
    setErr(null);

    const q = Number(editQuota);
    if (!Number.isFinite(q) || q <= 0) {
      setErr('Quota must be a positive number.');
      return;
    }

    setSavingId(id);
    const token = await getTokenOrRedirect();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/photographers', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          company_name: editCompany.trim() || null,
          quota_yearly: q,
        }),
      });

      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Update failed');

      cancelEdit();
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (p: AdminPhotographer) => {
    setErr(null);
    setTogglingId(p.id);

    const token = await getTokenOrRedirect();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/photographers', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: p.id,
          is_active: !p.is_active,
        }),
      });

      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Toggle failed');

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setTogglingId(null);
    }
  };

  const resetPeriod1y = async (p: AdminPhotographer) => {
    if (!confirm('Reset period to today → +1 year?')) return;
    setErr(null);
    setResettingPeriodId(p.id);

    const token = await getTokenOrRedirect();
    if (!token) return;

    const today = new Date();
    const start = today.toISOString().slice(0, 10);
    const end = new Date(today);
    end.setFullYear(end.getFullYear() + 1);
    const endStr = end.toISOString().slice(0, 10);

    try {
      const res = await fetch('/api/admin/photographers', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: p.id,
          period_start: start,
          period_end: endStr,
        }),
      });

      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Reset period failed');

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setResettingPeriodId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">Učitavanje…</p>
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Photographers</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Total: <span className="font-semibold">{list.length}</span> · Active:{' '}
            <span className="font-semibold">{activeCount}</span>
          </p>
        </div>

        <button
          onClick={load}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          Osvježi
        </button>
      </div>

      {/* Create card */}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-card dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold">Add Photographer</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Sends a magic link invite email and creates a photographer record.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="text-xs text-neutral-500">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-neutral-500">Company name</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Optional"
              className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-neutral-500">Quota yearly</label>
            <input
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              inputMode="numeric"
              className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-white/5"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={create}
            disabled={creating}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Send Invite + Create'}
          </button>
        </div>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
          No photographers yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {list.map((p) => {
            const isEditing = editingId === p.id;
            const busy = savingId === p.id || togglingId === p.id || resettingPeriodId === p.id;

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-card dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {p.company_name || '—'}{' '}
                      <span className="ml-2 text-xs text-neutral-500">
                        {p.email ? <span className="font-mono">{p.email}</span> : 'email unknown'}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                      Quota: <span className="font-semibold">{p.quota_yearly}</span> · Period:{' '}
                      {p.period_start} → {p.period_end}
                    </div>

                    <div className="mt-2 text-xs text-neutral-500">
                      User ID: <span className="font-mono">{p.user_id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs ${
                        p.is_active
                          ? 'border-black/10 text-neutral-700 dark:border-white/10 dark:text-neutral-300'
                          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>

                    <button
                      onClick={() => toggleActive(p)}
                      disabled={busy}
                      className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-60 ${
                        p.is_active
                          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200'
                          : 'border-black/10 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
                      }`}
                      title="Toggle portal access"
                    >
                      {togglingId === p.id ? 'Saving…' : p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>

                {/* Editor */}
                {isEditing ? (
                  <div className="mt-4 rounded-2xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/10">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs text-neutral-500">Company name</label>
                        <input
                          value={editCompany}
                          onChange={(e) => setEditCompany(e.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-neutral-500">Quota yearly</label>
                        <input
                          value={editQuota}
                          onChange={(e) => setEditQuota(e.target.value)}
                          inputMode="numeric"
                          className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => saveEdit(p.id)}
                        disabled={savingId === p.id}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                      >
                        {savingId === p.id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => startEdit(p)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      Edit quota/company
                    </button>

                    <button
                      onClick={() => resetPeriod1y(p)}
                      disabled={resettingPeriodId === p.id}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      title="Set period_start=today and period_end=+1 year"
                    >
                      {resettingPeriodId === p.id ? 'Resetting…' : 'Reset period (1y)'}
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
