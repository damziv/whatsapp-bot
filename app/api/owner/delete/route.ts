export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

function verifyJwt(token: string) {
  const secret = process.env.OWNER_JWT_SECRET || 'dev-secret';
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;

  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  if (sig !== s) return null;

  const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload?.typ !== 'owner') return null;
  return payload as { album_id: string; code: string; exp: number; typ: 'owner' };
}

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get('owner_session')?.value;
  if (!cookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = verifyJwt(cookie);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null) as null | { media_id: string; code: string };
  const media_id = body?.media_id || '';
  const code = (body?.code || '').trim().toUpperCase();
  if (!media_id || !code) return NextResponse.json({ error: 'Missing media_id or code' }, { status: 400 });
  if (code !== session.code) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Resolve album -> event_slug/album_slug, then ensure media belongs to that album
  const { data: album, error: albErr } = await supabaseAdmin
    .from('albums')
    .select('event_slug, album_slug')
    .eq('code', code)
    .maybeSingle();

  if (albErr) return NextResponse.json({ error: albErr.message }, { status: 500 });
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });

  const { data: media, error: mErr } = await supabaseAdmin
    .from('media')
    .select('id, storage_key, event_slug, album_slug')
    .eq('id', media_id)
    .maybeSingle();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!media) return NextResponse.json({ error: 'Media not found' }, { status: 404 });

  if (media.event_slug !== album.event_slug || media.album_slug !== album.album_slug) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // delete from storage
  const { error: delErr } = await supabaseAdmin.storage.from('media').remove([media.storage_key]);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // delete row
  const { error: dbDelErr } = await supabaseAdmin.from('media').delete().eq('id', media_id);
  if (dbDelErr) return NextResponse.json({ error: dbDelErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
