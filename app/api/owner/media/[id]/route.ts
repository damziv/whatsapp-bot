export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

function base64urlToBuf(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

type OwnerTokenPayload = { album_id: string; code: string; exp: number };

function verifyOwnerToken(token: string): OwnerTokenPayload | null {
  const secret = process.env.OWNER_SESSION_SECRET || process.env.OWNER_PIN_SALT || 'dev-secret';

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;

  const data = `${h}.${p}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest();
  const got = base64urlToBuf(sig);

  if (expected.length !== got.length) return null;
  if (!crypto.timingSafeEqual(expected, got)) return null;

  const raw: unknown = JSON.parse(base64urlToBuf(p).toString('utf8'));

  if (typeof raw !== 'object' || raw === null) return null;
  const payload = raw as Partial<OwnerTokenPayload>;

  if (!payload.exp || typeof payload.exp !== 'number') return null;
  if (Date.now() / 1000 > payload.exp) return null;

  if (!payload.album_id || typeof payload.album_id !== 'string') return null;
  if (!payload.code || typeof payload.code !== 'string') return null;

  return payload as OwnerTokenPayload;
}

function getBearer(req: NextRequest) {
  const authz = req.headers.get('authorization') || '';
  return authz.startsWith('Bearer ') ? authz.slice(7) : null;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyOwnerToken(token);
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Resolve album -> event_slug/album_slug to ensure ownership
  const { data: album, error: albErr } = await supabaseAdmin
    .from('albums')
    .select('id, event_slug, album_slug')
    .eq('id', payload.album_id)
    .maybeSingle();

  if (albErr) return NextResponse.json({ error: albErr.message }, { status: 500 });
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });

  // Find the media row by id (must match album event/slug)
  const { data: media, error: mErr } = await supabaseAdmin
    .from('media')
    .select('id, storage_key, event_slug, album_slug')
    .eq('id', id)
    .maybeSingle();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (media.event_slug !== album.event_slug || media.album_slug !== album.album_slug) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete from storage first
  const rm = await supabaseAdmin.storage.from('media').remove([media.storage_key]);
  if (rm.error) return NextResponse.json({ error: rm.error.message }, { status: 500 });

  // Delete DB row
  const del = await supabaseAdmin.from('media').delete().eq('id', id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
