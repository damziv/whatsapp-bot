// app/api/auth/request-otp/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type Body = { email?: string };

function getIP(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '90 s'), // 1 request per 90 seconds per ip+email
  analytics: true,
  prefix: 'otp',
});

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);

    const body = (await req.json().catch(() => ({}))) as Body;
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Rate limit key: ip + email
    const key = `${ip}:${email}`;
    const rl = await ratelimit.limit(key);

    if (!rl.success) {
      const retryAfterSec = rl.reset ? Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000)) : 90;
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
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
      // Normalize Supabase rate limit into 429
      if (error.message.toLowerCase().includes('rate limit')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a minute and try again.' },
          { status: 429, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
