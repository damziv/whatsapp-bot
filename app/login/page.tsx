// app/login/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

const COOLDOWN_MS = 60_000;

// Persist cooldown per email (so different emails don’t block each other)
function cooldownKey(email: string) {
  return `otpCooldownUntil:${email.trim().toLowerCase()}`;
}

function readCooldownUntil(email: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(cooldownKey(email));
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeCooldownUntil(email: string, until: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(cooldownKey(email), String(until));
  } catch {
    // ignore
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState<number>(() => Date.now());

  const submitLockRef = useRef(false);
  const router = useRouter();

  const emailNorm = useMemo(() => email.trim().toLowerCase(), [email]);

  // Timer tick (for countdown)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Load cooldown for current email (persists across refresh on mobile)
  useEffect(() => {
    const stored = readCooldownUntil(emailNorm);
    setCooldownUntil(stored);
  }, [emailNorm]);

  const cooldownActive = cooldownUntil > now;
  const secondsLeft = cooldownActive ? Math.ceil((cooldownUntil - now) / 1000) : 0;

  // If already signed in, redirect to portal
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) router.replace('/portal');
      else setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // hard guard against double tap / duplicate submit
    if (submitLockRef.current) return;
    if (loading) return;

    // guard across reloads (localStorage persisted)
    const stored = readCooldownUntil(emailNorm);
    if (stored > Date.now()) {
      setCooldownUntil(stored);
      setErr('Please wait a moment before requesting another link.');
      return;
    }

    submitLockRef.current = true;
    setErr(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();

      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : '';

      const { error } = await supabase.auth.signInWithOtp({
        email: emailNorm,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw error;

      const until = Date.now() + COOLDOWN_MS;
      setCooldownUntil(until);
      writeCooldownUntil(emailNorm, until);

      setSent(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);

      // If Supabase rate-limited, enforce cooldown anyway (persisted)
      if (msg.toLowerCase().includes('rate limit')) {
        const until = Date.now() + COOLDOWN_MS;
        setCooldownUntil(until);
        writeCooldownUntil(emailNorm, until);
        setErr('Too many requests. Please wait a minute and try again.');
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
            Checking session…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            💍
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Sign in</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            We’ll email you a magic link to access the portal.
          </p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card backdrop-blur dark:border-white/10 dark:bg-white/5">
          {sent ? (
            <div className="space-y-2 text-center" aria-live="polite">
              <h2 className="text-lg font-semibold">Check your email</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                We sent a sign-in link to <span className="font-medium">{emailNorm}</span>. Open it on this device to
                continue.
              </p>

              {secondsLeft > 0 ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  You can request a new link in {secondsLeft}s.
                </p>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Didn’t get it? Check spam/junk and wait a moment before retrying.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setErr(null);
                }}
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:hover:bg-white/10"
              >
                Use a different email
              </button>
            </div>
          ) : (
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
              />

              <button
                disabled={loading || cooldownActive || emailNorm.length === 0}
                type="submit"
                className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {loading ? 'Sending…' : cooldownActive ? `Try again in ${secondsLeft}s` : 'Send magic link'}
              </button>

              {err && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
                  {err}
                </p>
              )}

              <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
                Tip: make sure you added <span className="font-medium">http://localhost:3000/*</span> to Supabase Redirect URLs.
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>
    </main>
  );
}
