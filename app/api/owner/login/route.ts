export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

function hashPin(pin: string) {
  const salt = process.env.OWNER_PIN_SALT || 'dev-salt';
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

// minimal JWT (HS256)
function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signJwt(payload: any) {
  const secret = process.env.OWNER_JWT_SECRET || 'dev-secret';
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = payload;

  const encHeader = base64url(JSON.stringify(header));
  const encBody = base64url(JSON.stringify(body));
  const data = `${encHeader}.${encBody}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64');
  const encSig = sig.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${data}.${encSig}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as null | { code: string; pin: string };
  const code = (body?.code || '').trim().toUpperCase();
  const pin = (body?.pin || '').trim();

  if (!code || !pin) return NextResponse.json({ error: 'Missing code or pin' }, { status: 400 });

  const { data: album, error } = await supabaseAdmin
    .from('albums')
    .select('id, code, owner_pin_hash, is_active')
    .eq('code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });

  const expected = album.owner_pin_hash || '';
  if (!expected || hashPin(pin) !== expected) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  // 12h session
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const token = signJwt({
    typ: 'owner',
    album_id: album.id,
    code: album.code,
    exp,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('owner_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 12 * 60 * 60,
  });

  return res;
}
