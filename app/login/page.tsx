// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '');
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${baseUrl}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const goCreate = () => {
    const qs = email ? `?email=${encodeURIComponent(email)}` : '';
    router.push(`/dashboard${qs}`);
  };

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
        Access your albums
      </h1>

      {sent ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button disabled={loading} type="submit">
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
            {err && <p style={{ color: 'crimson' }}>{err}</p>}
          </form>

          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            <div style={{ textAlign: 'center', opacity: 0.7, fontSize: 12 }}>or</div>
            <button onClick={goCreate} type="button">
              Create your albums instead
            </button>
          </div>
        </>
      )}
    </main>
  );
}
