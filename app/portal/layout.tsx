// app/portal/layout.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type MeResponse =
  | { isPhotographer: true; isActive: boolean; photographer: any }
  | { isPhotographer: false; isActive: false }
  | { error: string };

export default function PortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'denied' | 'inactive' | 'ok'>('loading');
  const [msg, setMsg] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);

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

  const signOut = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const NavItem = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setMenuOpen(false)}
        className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
          active
            ? 'bg-brand-600 text-white'
            : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10'
        }`}
      >
        {label}
      </Link>
    );
  };

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
                onClick={signOut}
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

  // OK: show portal shell + children pages
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-brand-50 to-white dark:from-neutral-900 dark:to-neutral-950">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 border-r border-black/5 bg-white p-4 dark:border-white/10 dark:bg-neutral-900 md:block">
        <div className="mb-6 text-lg font-semibold">📸 Portal</div>
        <nav className="space-y-1">
          <NavItem href="/portal/albums" label="Albums" />
          <NavItem href="/portal/create" label="Create album" />
        </nav>

        <button
          onClick={signOut}
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          Sign out
        </button>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 dark:border-white/10 dark:bg-neutral-900">
        <button onClick={() => setMenuOpen(true)} className="text-xl" aria-label="Menu">
          ☰
        </button>
        <div className="font-semibold">Portal</div>
        <button onClick={signOut} className="text-sm underline">
          Sign out
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
          <div className="absolute left-0 top-0 h-full w-64 bg-white p-4 dark:bg-neutral-900">
            <div className="mb-6 flex items-center justify-between">
              <div className="font-semibold">📸 Portal</div>
              <button onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <nav className="space-y-1">
              <NavItem href="/portal/albums" label="Albums" />
              <NavItem href="/portal/create" label="Create album" />
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8">{children}</main>
    </div>
  );
}
