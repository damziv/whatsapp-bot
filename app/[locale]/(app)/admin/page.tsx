'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function AdminHome() {
  const [wiping, setWiping] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const wipeDemo = async () => {
    if (!confirm('Wipe ALL photos from the demo gallery? The demo album itself stays.')) return;

    setMsg(null);
    setWiping(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch('/api/admin/demo-wipe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Wipe failed');
      setMsg(`Demo gallery cleared (${out.deleted} item${out.deleted === 1 ? '' : 's'} removed).`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Wipe failed');
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Admin</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Manage photographers and albums.
        </p>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold">Demo</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          The <span className="font-medium">/demo</span> page shares one always-open album for cold
          outreach. Wipe its uploads anytime to keep it clean.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={wipeDemo}
            disabled={wiping}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
          >
            {wiping ? 'Wiping…' : 'Wipe demo gallery'}
          </button>
          <a
            href="/demo"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Open /demo
          </a>
          {msg && <span className="text-sm text-neutral-600 dark:text-neutral-300">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
