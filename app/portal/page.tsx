// app/portal/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/portal/albums');
  }, [router]);

  return null;
}
