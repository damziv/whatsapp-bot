// app/api/admin/demo-wipe/route.ts
// Admin-only: clears all uploaded media from the always-open DEMO album,
// without deleting the album itself (so the /demo page keeps working).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const DEMO_CODE = (process.env.DEMO_ALBUM_CODE || 'DEMO').toUpperCase();

function getBearer(req: NextRequest) {
  const authz = req.headers.get('authorization') || '';
  return authz.startsWith('Bearer ') ? authz.slice(7) : null;
}

async function requireAdmin(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const { data: adminRow, error: aErr } = await supabaseAdmin
    .from('admins')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (aErr) return { ok: false as const, status: 500, error: aErr.message };
  if (!adminRow) return { ok: false as const, status: 403, error: 'Forbidden' };

  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { data: album, error: albErr } = await supabaseAdmin
    .from('albums')
    .select('id, event_slug, album_slug')
    .eq('code', DEMO_CODE)
    .maybeSingle();

  if (albErr) return NextResponse.json({ error: albErr.message }, { status: 500 });
  if (!album) return NextResponse.json({ error: `Demo album "${DEMO_CODE}" not found` }, { status: 404 });

  const { data: mediaRows, error: mErr } = await supabaseAdmin
    .from('media')
    .select('storage_key')
    .eq('event_slug', album.event_slug)
    .eq('album_slug', album.album_slug);

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const keys = (mediaRows ?? []).map((r) => r.storage_key).filter(Boolean);

  const CHUNK = 200;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const slice = keys.slice(i, i + CHUNK);
    const { error: delErr } = await supabaseAdmin.storage.from('media').remove(slice);
    if (delErr) console.error('demo-wipe storage remove error:', delErr.message);
  }

  const { error: rowErr } = await supabaseAdmin
    .from('media')
    .delete()
    .eq('event_slug', album.event_slug)
    .eq('album_slug', album.album_slug);

  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: keys.length });
}
