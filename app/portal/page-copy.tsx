'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import PortalClient from './portal-client';

type MeResponse =
  | { isPhotographer: true; isActive: boolean; photographer: any }
  | { isPhotographer: false; isActive: false }
  | { error: string };

export default function PortalPage() {
  const [status, setStatus] = useState<'loading' | 'denied' | 'inactive' | 'ok'>('loading');
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowser();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = (await res.json()) as MeResponse;

      if (cancelled) return;

      if (!res.ok || ('error' in payload && payload.error)) {
        setStatus('denied');
        setMsg(('error' in payload && payload.error) || 'Access denied');
        return;
      }

      if (!('isPhotographer' in payload) || payload.isPhotographer !== true) {
        setStatus('denied');
        setMsg('Your portal access is not enabled yet.');
        return;
      }

      if (!payload.isActive) {
        setStatus('inactive');
        setMsg('Your account is inactive. Please contact support.');
        return;
      }

      setStatus('ok');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-4xl">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading…</p>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'denied' || status === 'inactive') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Portal</h1>
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{msg}</p>

            <div className="mt-6">
              <button
                onClick={async () => {
                  const supabase = getSupabaseBrowser();
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return <PortalClient />;
}
