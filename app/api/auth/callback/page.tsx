// app/auth/callback/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState('Completing sign-in…');

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowser();

        // Case A: magic-link tokens in URL hash (#access_token=...&refresh_token=...)
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
          const params = new URLSearchParams(window.location.hash.slice(1));
          const access_token = params.get('access_token') ?? '';
          const refresh_token = params.get('refresh_token') ?? '';
          if (!access_token || !refresh_token) throw new Error('Missing token(s) in URL hash');

          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;

          // clean up the hash
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, document.title, cleanUrl);

          router.replace('/portal');
          return;
        }

        // Case B: PKCE-style (?code=...)
        const code = sp.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          router.replace('/portal');
          return;
        }

        setMsg('Missing credentials in URL. Please open the link from the same device/browser.');
      } catch (e) {
        console.error(e);
        setMsg('Sign-in failed. Please try again.');
      }
    })();
  }, [router, sp]);

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
      <p>{msg}</p>
    </main>
  );
}

function Fallback() {
  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
      <p>Loading…</p>
    </main>
  );
}
