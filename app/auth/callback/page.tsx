'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
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
      const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
      if (error) {
        setMsg('Sign-in failed.');
        return;
      }
      // Go to the user portal
      router.replace('/portal');
    })();
  }, [sp, router]);

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
      <p>{msg}</p>
    </main>
  );
}
