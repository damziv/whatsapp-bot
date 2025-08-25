// app/portal/page.tsx (or your current file path)
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type Album = {
  id: string;
  event_id: string;
  code: string;
  event_slug: string;
  album_slug: 'bachelor' | 'bachelorette' | 'wedding';
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
};

type Profile = {
  id: string;
  bride_name: string | null;
  groom_name: string | null;
};

type MyData = {
  profile: Profile | null;
  events: Array<{ id: string; type: Album['album_slug']; date: string; start_at: string | null; end_at: string | null }>;
  albums: Album[];
  error?: string;
};

export default function PortalPage() {
  const [data, setData] = useState<MyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
      try {
        const res = await fetch('/api/my-data', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await res.json()) as {
          profile: MyData['profile'];
          events: MyData['events'];
          albums: MyData['albums'];
          error?: string;
        };
        if (!res.ok || payload.error) throw new Error(payload.error || 'Failed');
        if (!cancelled) {
          setData({
            profile: payload.profile,
            events: payload.events,
            albums: payload.albums,
          });
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
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

  if (err) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-4xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <p className="text-sm" role="alert" aria-live="assertive">{err}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!data?.profile) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Your Albums</h1>
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">No profile found for your email.</p>
            <a href="/dashboard" className="mt-3 inline-block text-sm font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300">
              Create albums
            </a>
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

  const labels: Record<Album['album_slug'], string> = {
    wedding: 'Wedding',
    bachelor: 'Bachelor Party',
    bachelorette: 'Bachelorette Party',
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Your Albums</h1>
          <button
            onClick={signOut}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {data.profile.bride_name} &amp; {data.profile.groom_name}
        </p>

        {/* Albums list */}
        <div className="mt-6 grid gap-4">
          {data.albums.length === 0 && (
            <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
              No albums yet.{' '}
              <a href="/dashboard" className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300">
                Create albums
              </a>
            </div>
          )}

          {data.albums.map((a) => {
            const shareLink = `/w?code=${encodeURIComponent(a.code)}`;
            const galleryLink = `/gallery?code=${encodeURIComponent(a.code)}`;
            const qrImg = `/api/qr?data=${encodeURIComponent(window.location.origin + shareLink)}`;

            return (
              <div
                key={a.id}
                className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-card dark:border-white/10 dark:bg-white/5"
              >
                <div className="shrink-0">
                  <Image src={qrImg} alt="QR" width={110} height={110} unoptimized className="rounded-xl ring-1 ring-black/5 dark:ring-white/10" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="font-semibold">{labels[a.album_slug] || a.album_slug}</div>
                    <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-neutral-700 dark:border-white/10 dark:text-neutral-300">
                      {a.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                    Window:{' '}
                    {a.start_at ? new Date(a.start_at).toLocaleString() : 'N/A'} →{' '}
                    {a.end_at ? new Date(a.end_at).toLocaleString() : 'N/A'}
                  </div>

                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="truncate">
                      <span className="text-xs text-neutral-500">QR target: </span>
                      <a
                        href={shareLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 dark:text-brand-300"
                      >
                        {shareLink}
                      </a>
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
                    </div>
                    <div className="truncate">
                      <span className="text-xs text-neutral-500">Album code: </span>
                      <code className="rounded-md bg-black/5 px-1.5 py-0.5 text-[12px] dark:bg-white/10">{a.code}</code>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <a
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Create new albums
          </a>
        </div>
      </div>
    </main>
  );
}
