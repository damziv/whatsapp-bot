// app/api/owner/schedule-purge/route.ts
// Called by the owner (couple) right after they finish downloading the ZIP.
// Schedules the whole album's media for deletion 24h later (the cron does the work).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

function getBearer(req: NextRequest) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

function base64urlToBuf(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

// Same scheme as /api/owner/session and /api/owner/media/[id].
function verifyOwnerToken(token: string): { album_id: string; code: string; exp: number } | null {
  const secret = process.env.OWNER_SESSION_SECRET || process.env.OWNER_PIN_SALT || 'dev-secret';
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;

  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest();
  const got = base64urlToBuf(sig);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return null;

  const payload = JSON.parse(base64urlToBuf(p).toString('utf8'));
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (!payload?.album_id || !payload?.code) return null;
  return payload;
}

export async function POST(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyOwnerToken(token);
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | { code?: string };
  const code = (body?.code || '').trim().toUpperCase();
  if (!code || code !== payload.code.toUpperCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const purgeAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from('albums')
    .update({ download_purge_at: purgeAt })
    .eq('id', payload.album_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, purge_at: purgeAt });
}
