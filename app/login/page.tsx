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
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">💍</div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Access your albums</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Sign in with a magic link to manage or view your wedding albums.
          </p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card backdrop-blur dark:border-white/10 dark:bg-white/5">
          {sent ? (
            <div className="space-y-2 text-center" aria-live="polite">
              <h2 className="text-lg font-semibold">Check your email</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                We sent a sign‑in link to <span className="font-medium">{email}</span>. Open it on this device to continue.
              </p>
            </div>
          ) : (
            <>
              <form onSubmit={onSubmit} className="grid gap-3">
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
                />

                <button
                  disabled={loading}
                  type="submit"
                  className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>

                {err && (
                  <p
                    className="mt-1 text-sm text-red-600 dark:text-red-400"
                    role="alert"
                    aria-live="assertive"
                  >
                    {err}
                  </p>
                )}
              </form>

              <div className="mt-6 grid gap-3">
                <div className="text-center text-xs text-neutral-500">or</div>
                <button
                  onClick={goCreate}
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:hover:bg-white/10"
                >
                  Create your albums instead
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>
    </main>
  );
}
