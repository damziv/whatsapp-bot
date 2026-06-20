'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const t = useTranslations('Register');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !cleanEmail.includes('@')) {
      setErr(t('errInvalid'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, message: message.trim() }),
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        throw new Error((out as { error?: string })?.error || t('errFailed'));
      }
      setSent(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t('errFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 pt-32 pb-16 dark:from-neutral-900 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">{t('title')}</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{t('subtitle')}</p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          {sent ? (
            <div className="text-center" aria-live="polite">
              <h2 className="text-lg font-semibold">{t('successTitle')}</h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                {t('successBody', { email: email.trim().toLowerCase() })}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">{t('nameLabel')}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  required
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium">{t('emailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium">{t('messageLabel')}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              {err && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
                  {err}
                </p>
              )}

              <button
                disabled={submitting}
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? t('submitting') : t('submit')}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {t('haveAccount')}{' '}
          <a href="/login" className="font-semibold text-brand-700 underline underline-offset-4 dark:text-brand-300">
            {t('signIn')}
          </a>
        </p>
      </div>
    </main>
  );
}
