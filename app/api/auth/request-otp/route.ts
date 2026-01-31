// app/api/auth/request-otp/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type Body = { email?: string };

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function getIP(req: NextRequest) {
  // These are added by the platform/proxy (not visible in browser devtools request headers)
  const vercel = req.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0]?.trim() || 'unknown';

  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';

  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();

  return 'unknown';
}

const redis = Redis.fromEnv();

// More forgiving, still safe:
// - allows a couple retries without being annoying
// - still blocks spamming & bots
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '5 m'), // 3 requests per 5 minutes per ip+email
  analytics: true,
  prefix: 'otp',
});

export async function GET() {
  // quick health-check
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const ip = getIP(req);
    const key = `${ip}:${email}`;

    const rl = await ratelimit.limit(key);

    // Helpful headers so you can debug it in devtools
    const debugHeaders: Record<string, string> = {
      'Cache-Control': 'no-store',
      'x-rl-limit': String(rl.limit ?? ''),
      'x-rl-remaining': String(rl.remaining ?? ''),
      'x-rl-reset': String(rl.reset ?? ''),
      'x-rl-key': key, // remove later if you don’t want this exposed
    };

    if (!rl.success) {
      const retryAfterSec = rl.reset ? Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000)) : 60;
      return NextResponse.json(
        { error: 'Too many requests. Please wait a bit and try again.' },
        {
          status: 429,
          headers: {
            ...debugHeaders,
            'Retry-After': String(retryAfterSec),
          },
        }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500, headers: debugHeaders });
    }

    const supabase = createClient(url, anon);

    // Always redirect back to the origin that initiated login
    const origin = req.headers.get('origin') || '';
    const redirectTo = origin ? `${origin}/auth/callback` : '';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      // normalize Supabase rate limiting into 429 too
      if (error.message.toLowerCase().includes('rate limit')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a bit and try again.' },
          { status: 429, headers: { ...debugHeaders, 'Retry-After': '60' } }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400, headers: debugHeaders });
    }

    return NextResponse.json({ ok: true }, { headers: debugHeaders });
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
