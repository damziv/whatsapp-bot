export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function safeEqualHex(a: string, b: string) {
  // constant-time compare
  const aa = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function base64url(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signOwnerToken(payload: object) {
  const secret = process.env.OWNER_SESSION_SECRET || process.env.OWNER_PIN_SALT || 'dev-secret';
  const header = { alg: 'HS256', typ: 'JWT' };

  const h = base64url(Buffer.from(JSON.stringify(header)));
  const p = base64url(Buffer.from(JSON.stringify(payload)));
  const data = `${h}.${p}`;

  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as null | { code?: string; pin?: string };
  const code = (body?.code || '').trim().toUpperCase();
  const pin = (body?.pin || '').trim();

  if (!code || !pin) {
    return NextResponse.json({ error: 'Missing code or pin' }, { status: 400 });
  }

  const { data: album, error } = await supabaseAdmin
    .from('albums')
    .select('id, code, event_slug, album_slug, owner_pin_hash, is_active, start_at, end_at')
    .eq('code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });

  if (!album.owner_pin_hash) {
    return NextResponse.json({ error: 'Owner PIN not set for this album' }, { status: 403 });
  }

  const salt = process.env.OWNER_PIN_SALT || 'dev-salt';
  const candidateHash = sha256Hex(pin + salt);

  if (!safeEqualHex(candidateHash, album.owner_pin_hash)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  // 12h owner session
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const token = signOwnerToken({
    sub: 'owner',
    album_id: album.id,
    code: album.code,
    exp,
  });

  return NextResponse.json({
    ok: true,
    token,
    expires_at: exp,
  }, { headers: { 'Cache-Control': 'no-store' }});
}
