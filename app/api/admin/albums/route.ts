// app/(app)/api/admin/albums/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function getBearer(req: NextRequest) {
  const authz = req.headers.get('authorization') || '';
  return authz.startsWith('Bearer ') ? authz.slice(7) : null;
}

async function requireAdmin(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const userId = userData.user.id;

  const { data: adminRow, error: aErr } = await supabaseAdmin
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (aErr) return { ok: false as const, status: 500, error: aErr.message };
  if (!adminRow) return { ok: false as const, status: 403, error: 'Forbidden' };

  return { ok: true as const };
}

type AdminAlbumRow = {
  id: string;
  code: string;
  event_slug: string;
  album_slug: string;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  created_at: string;
  events?: any;
};

function firstRel<T>(rel: any): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

// -------------------- GET --------------------
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(Number(searchParams.get('limit') || 50), 200);

  let query = supabaseAdmin
    .from('albums')
    .select(
      `
      id, code, event_slug, album_slug, start_at, end_at, is_active, created_at,
      events:event_id(
        type,
        date,
        profiles:profile_id(
          bride_name,
          groom_name,
          owner_email
        )
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (q) query = query.ilike('code', `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as AdminAlbumRow[];

  const eventSlugs = Array.from(new Set(rows.map((r) => r.event_slug).filter(Boolean)));
  const mediaCount: Record<string, number> = {};

  if (eventSlugs.length > 0) {
    const { data: media, error: mErr } = await supabaseAdmin
      .from('media')
      .select('event_slug, album_slug')
      .in('event_slug', eventSlugs)
      .limit(5000);

    if (!mErr && media) {
      for (const m of media as any[]) {
        const k = `${m.event_slug}|||${m.album_slug}`;
        mediaCount[k] = (mediaCount[k] ?? 0) + 1;
      }
    }
  }

  return NextResponse.json({
    albums: rows.map((r) => {
      const ev = firstRel<any>(r.events);
      const pr = firstRel<any>(ev?.profiles);

      const bride = pr?.bride_name ?? null;
      const groom = pr?.groom_name ?? null;
      const owner_email = pr?.owner_email ?? null;
      const type = ev?.type ?? null;
      const date = ev?.date ?? null;

      const k = `${r.event_slug}|||${r.album_slug}`;
      const count = mediaCount[k] ?? 0;

      return {
        id: r.id,
        code: r.code,
        event_slug: r.event_slug,
        album_slug: r.album_slug,
        start_at: r.start_at,
        end_at: r.end_at,
        is_active: r.is_active,
        created_at: r.created_at,
        bride_name: bride,
        groom_name: groom,
        owner_email,
        event_type: type,
        event_date: date,
        media_count: count,
      };
    }),
  });
}

// -------------------- DELETE (admin bypass 24h) --------------------
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = (await req.json().catch(() => null)) as null | { code: string };
    const code = (body?.code || '').trim().toUpperCase();
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    const { data: row, error } = await supabaseAdmin
      .from('albums')
      .select(
        `
        id, code, event_slug, album_slug, created_at,
        event_id,
        events:event_id(profile_id)
      `
      )
      .eq('code', code)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const eventSlug = (row as any).event_slug as string;
    const albumSlug = (row as any).album_slug as string;

    const ev = firstRel<any>((row as any).events);
    const profileId = ev?.profile_id as string | undefined;

    // 1) Collect all storage keys from media table for this album
    const { data: mediaRows, error: mErr } = await supabaseAdmin
      .from('media')
      .select('storage_key')
      .eq('event_slug', eventSlug)
      .eq('album_slug', albumSlug);

    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

    const keys = (mediaRows ?? []).map((r: any) => r.storage_key).filter(Boolean);

    // 2) Delete from storage in chunks
    const CHUNK = 200;
    for (let i = 0; i < keys.length; i += CHUNK) {
      const slice = keys.slice(i, i + CHUNK);
      const { error: delErr } = await supabaseAdmin.storage.from('media').remove(slice);
      if (delErr) console.error('storage remove error:', delErr.message);
    }

    // 3) Delete media rows
    await supabaseAdmin.from('media').delete().eq('event_slug', eventSlug).eq('album_slug', albumSlug);

    // 4) Delete profile (cascades events+albums)
    if (profileId) {
      const { error: pDelErr } = await supabaseAdmin.from('profiles').delete().eq('id', profileId);
      if (pDelErr) return NextResponse.json({ error: pDelErr.message }, { status: 500 });
    } else {
      const { error: aDelErr } = await supabaseAdmin.from('albums').delete().eq('id', (row as any).id);
      if (aDelErr) return NextResponse.json({ error: aDelErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('ADMIN DELETE ALBUM ERROR:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected server error' }, { status: 500 });
  }
}
