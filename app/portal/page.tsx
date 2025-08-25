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

  if (loading) return <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}><p>Loading…</p></main>;
  if (err) return <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}><p style={{ color: 'crimson' }}>{err}</p></main>;

  if (!data?.profile) {
    return (
      <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Your Albums</h1>
        <p>No profile found for your email.</p>
        <a href="/dashboard" style={{ textDecoration: 'underline' }}>Create albums</a>
        <div style={{ marginTop: 24 }}><button onClick={signOut}>Sign out</button></div>
      </main>
    );
  }

  const labels: Record<Album['album_slug'], string> = {
    wedding: 'Wedding',
    bachelor: 'Bachelor Party',
    bachelorette: 'Bachelorette Party',
  };

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Your Albums</h1>
        <button onClick={signOut}>Sign out</button>
      </div>
      <p style={{ opacity: 0.8 }}>
        {data.profile.bride_name} &amp; {data.profile.groom_name}
      </p>

      <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
        {data.albums.length === 0 && (
          <div>No albums yet. <a href="/dashboard">Create albums</a></div>
        )}

        {data.albums.map((a) => {
          const shareLink = `/w?code=${encodeURIComponent(a.code)}`;
          const galleryLink = `/gallery?code=${encodeURIComponent(a.code)}`;
          const qrImg = `/api/qr?data=${encodeURIComponent(window.location.origin + shareLink)}`;

          return (
            <div key={a.id} style={{ display: 'flex', gap: 16, alignItems: 'center', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
              <Image src={qrImg} alt="QR" width={110} height={110} unoptimized />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{labels[a.album_slug] || a.album_slug}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                  Window: {a.start_at ? new Date(a.start_at).toLocaleString() : 'N/A'} → {a.end_at ? new Date(a.end_at).toLocaleString() : 'N/A'}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>QR target: </span>
                    <a href={shareLink} target="_blank" rel="noreferrer">{shareLink}</a>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Public gallery: </span>
                    <a href={galleryLink} target="_blank" rel="noreferrer">{galleryLink}</a>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Album code: </span>
                    <code>{a.code}</code>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24 }}>
        <a href="/dashboard" style={{ textDecoration: 'underline' }}>Create new albums</a>
      </div>
    </main>
  );
}
