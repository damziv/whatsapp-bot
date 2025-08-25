// app/auth/callback/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Completing sign-in…');

  useEffect(() => {
    const code = sp.get('code');
    if (!code) {
      setMsg('Missing code.');
      return;
    }
    (async () => {
      try {
        const supabase = getSupabaseBrowser();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMsg('Sign-in failed.');
          return;
        }
        router.replace('/portal');
      } catch {
        setMsg('Sign-in failed.');
      }
    })();
  }, [sp, router]);

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
