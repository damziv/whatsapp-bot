export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function getBearer(req: NextRequest) {
  const authz = req.headers.get('authorization') || '';
  return authz.startsWith('Bearer ') ? authz.slice(7) : null;
}

async function getPhotographerByToken(token: string) {
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) return null;

  const { data: photographer } = await supabaseAdmin
    .from('photographers')
    .select('id, quota_yearly, period_start, period_end, is_active')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!photographer || !photographer.is_active) return null;
  return photographer;
}

// ===== existing helpers from your POST =====
function code7() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 7; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function computeUtcWindow(isoDate: string) {
  const anchor = new Date(isoDate + 'T00:00:00Z').getTime();
  const start = new Date(anchor - 24 * 3600 * 1000).toISOString();
  const end = new Date(anchor + 48 * 3600 * 1000).toISOString();
  return { start_at: start, end_at: end };
}

// -------------------- GET --------------------
export async function GET(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const photographer = await getPhotographerByToken(token);
  if (!photographer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: rows, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, bride_name, groom_name, created_at,
      events:events(id, date, start_at, end_at,
        albums:albums(id, code, is_active, start_at, end_at, created_at)
      )
    `)
    .eq('photographer_id', photographer.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const albums = (rows ?? [])
    .map((p: any) => {
      const ev = Array.isArray(p.events) ? p.events[0] : p.events;
      const al = ev?.albums ? (Array.isArray(ev.albums) ? ev.albums[0] : ev.albums) : null;
      if (!al) return null;
      return {
        profile_id: p.id,
        bride_name: p.bride_name,
        groom_name: p.groom_name,
        event_date: ev?.date ?? null,
        start_at: al.start_at ?? ev?.start_at ?? null,
        end_at: al.end_at ?? ev?.end_at ?? null,
        is_active: al.is_active,
        code: al.code,
        created_at: al.created_at,
      };
    })
    .filter(Boolean);

  const used = albums.length;

  return NextResponse.json(
    {
      photographer: {
        quota_yearly: photographer.quota_yearly,
        period_start: photographer.period_start,
        period_end: photographer.period_end,
      },
      usage: { used, quota: photographer.quota_yearly },
      albums,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// -------------------- POST --------------------
export async function POST(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const photographer = await getPhotographerByToken(token);
  if (!photographer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | null
    | {
        bride_name: string;
        groom_name: string;
        event_date?: string; // YYYY-MM-DD (optional)
      };

  if (!body?.bride_name || !body?.groom_name) {
    return NextResponse.json({ error: 'Missing bride_name/groom_name' }, { status: 400 });
  }

  // quota check (count profiles = albums in your 1-album-per-profile model)
  const { count, error: countErr } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('photographer_id', photographer.id);

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
  if ((count ?? 0) >= photographer.quota_yearly) {
    return NextResponse.json({ error: 'Quota reached' }, { status: 402 });
  }

  const origin = req.nextUrl.origin;

  // Create profile linked to photographer
  const { data: prof, error: profErr } = await supabaseAdmin
    .from('profiles')
    .insert({
      photographer_id: photographer.id,
      bride_name: body.bride_name,
      groom_name: body.groom_name,
      owner_email: null,
    })
    .select('id')
    .single();

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  const profileId = prof.id as string;
  const profileTag = profileId.replace(/-/g, '').slice(-6);

  const eventDate = body.event_date || new Date().toISOString().slice(0, 10);
  const { start_at, end_at } = computeUtcWindow(eventDate);

  const { data: evRow, error: evErr } = await supabaseAdmin
    .from('events')
    .insert({
      profile_id: profileId,
      type: 'wedding',
      date: eventDate,
      start_at,
      end_at,
    })
    .select('id')
    .single();

  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  const eventId = evRow.id as string;

  let code: string | null = null;
  for (let i = 0; i < 7; i++) {
    const candidate = code7();
    const { error: insertErr } = await supabaseAdmin.from('albums').insert({
      event_id: eventId,
      code: candidate,
      event_slug: `p_${profileTag}`,
      album_slug: 'wedding',
      start_at,
      end_at,
      is_active: true,
    });

    if (!insertErr) {
      code = candidate;
      break;
    }
    if (insertErr.message?.includes('duplicate key')) continue;
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  if (!code) return NextResponse.json({ error: 'Failed to allocate code' }, { status: 500 });

  const share_link = `${origin}/w?code=${encodeURIComponent(code)}`;
  const gallery_link = `${origin}/gallery?code=${encodeURIComponent(code)}`;

  // IMPORTANT: we never return the PIN (you store only hash); reset-pin route returns fresh PIN once.
  return NextResponse.json({
    album: {
      code,
      bride_name: body.bride_name,
      groom_name: body.groom_name,
      event_date: eventDate,
      start_at,
      end_at,
      is_active: true,
      share_link,
      gallery_link,
    },
  });
}

// -------------------- DELETE --------------------
// Allow delete only within 24h after creation (mistake protection)
export async function DELETE(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const photographer = await getPhotographerByToken(token);
  if (!photographer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | { code: string };
  const code = (body?.code || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  // Fetch album + ownership path (album -> event -> profile.photographer_id)
  const { data: row, error } = await supabaseAdmin
    .from('albums')
    .select(
      `
      id, code, event_slug, album_slug, created_at,
      event_id,
      events:event_id(
        profile_id,
        profiles:profile_id(photographer_id)
      )
    `
    )
    .eq('code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const photographerId = (row as any)?.events?.profiles?.photographer_id;
  if (photographerId !== photographer.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // 24h rule
  const createdAt = new Date((row as any).created_at).getTime();
  const ageMs = Date.now() - createdAt;
  if (ageMs > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Album can only be deleted within 24 hours of creation.' }, { status: 403 });
  }

  const eventSlug = (row as any).event_slug as string;
  const albumSlug = (row as any).album_slug as string;
  const profileId = (row as any)?.events?.profile_id as string | undefined;

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
    if (delErr) {
      // keep going, but log
      console.error('storage remove error:', delErr.message);
    }
  }

  // 3) Delete media rows
  await supabaseAdmin
    .from('media')
    .delete()
    .eq('event_slug', eventSlug)
    .eq('album_slug', albumSlug);

  // 4) Delete profile (cascades events+albums)
  if (profileId) {
    const { error: pDelErr } = await supabaseAdmin.from('profiles').delete().eq('id', profileId);
    if (pDelErr) return NextResponse.json({ error: pDelErr.message }, { status: 500 });
  } else {
    // fallback: delete just the album (should not happen in your model)
    const { error: aDelErr } = await supabaseAdmin.from('albums').delete().eq('id', (row as any).id);
    if (aDelErr) return NextResponse.json({ error: aDelErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
