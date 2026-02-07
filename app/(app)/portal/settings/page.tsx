'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type MeResponse =
  | { isPhotographer: true; isActive: boolean; photographer: any }
  | { isPhotographer: false; isActive: false }
  | { error: string };

type PortalPayload =
  | {
      photographer: {
        quota_yearly: number;
        period_start: string;
        period_end: string;
      };
      usage: { used: number; quota: number };
    }
  | { error: string };

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [portal, setPortal] = useState<PortalPayload | null>(null);

  const usageText = useMemo(() => {
    if (!portal || 'error' in portal) return null;
    return `${portal.usage.used}/${portal.usage.quota}`;
  }, [portal]);

  const periodText = useMemo(() => {
    if (!portal || 'error' in portal) return null;
    const s = new Date(portal.photographer.period_start).toLocaleDateString();
    const e = new Date(portal.photographer.period_end).toLocaleDateString();
    return `${s} → ${e}`;
  }, [portal]);

  const signOut = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
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
        // 1) /api/me (access + photographer record)
        const meRes = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meJson = (await meRes.json()) as MeResponse;

        if (!meRes.ok || ('error' in meJson && meJson.error)) {
          throw new Error(('error' in meJson && meJson.error) || 'Failed to load account');
        }

        // 2) /api/portal/albums (for usage/quota/period)
        const portalRes = await fetch('/api/portal/albums', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const portalJson = (await portalRes.json()) as PortalPayload;

        if (!portalRes.ok || ('error' in portalJson && portalJson.error)) {
          // This could happen if photographer is not active, etc.
          // Don’t hard-fail settings page; just show the account card.
          console.warn('portal/albums not available:', portalJson);
        }

        if (!cancelled) {
          setMe(meJson);
          setPortal(portalJson);
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-3xl">
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
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <p className="text-sm" role="alert" aria-live="assertive">
              {err}
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const isPhotographer = !!me && 'isPhotographer' in me && me.isPhotographer === true;
  const isActive = !!me && 'isActive' in me && me.isActive === true;

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">Settings</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              Account, plan and portal access.
            </p>
          </div>

          <button
            onClick={signOut}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </div>

        {/* Account card */}
        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">Account</h2>

          <div className="mt-4 grid gap-3 text-sm">
            <Row label="Role" value={isPhotographer ? 'Photographer' : 'No portal access'} />
            <Row label="Status" value={isActive ? 'Active' : 'Inactive'} />
            <Row
              label="User ID"
              value={
                isPhotographer && (me as any).photographer?.user_id
                  ? String((me as any).photographer.user_id)
                  : '—'
              }
            />
            <Row
              label="Photographer ID"
              value={
                isPhotographer && (me as any).photographer?.id
                  ? String((me as any).photographer.id)
                  : '—'
              }
            />
          </div>

          {!isPhotographer && (
            <div className="mt-4 rounded-xl border border-black/10 bg-black/5 p-4 text-sm text-neutral-700 dark:border-white/10 dark:bg-white/10 dark:text-neutral-200">
              Your portal access is not enabled yet. Contact support and we’ll activate your account.
            </div>
          )}

          {isPhotographer && !isActive && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              Your account is inactive. Contact support.
            </div>
          )}
        </section>

        {/* Plan card */}
        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">Plan</h2>

          {portal && !('error' in portal) ? (
            <div className="mt-4 grid gap-3 text-sm">
              <Row label="Albums used" value={usageText || '—'} />
              <Row label="Yearly quota" value={String(portal.photographer.quota_yearly)} />
              <Row label="Period" value={periodText || '—'} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
              Plan details are not available right now.
            </p>
          )}
        </section>

        {/* Support card */}
        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">Support</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Need help, invoice, or account activation? Contact support.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="mailto:support@yourdomain.com"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Email support
            </a>
            <button
              onClick={() => navigator.clipboard.writeText('support@yourdomain.com')}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Copy email
            </button>
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            (Replace <span className="font-mono">support@yourdomain.com</span> with your real support email.)
          </p>
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-black/5 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="text-neutral-600 dark:text-neutral-300">{label}</div>
      <div className="font-medium text-neutral-900 dark:text-neutral-100">{value}</div>
    </div>
  );
}
