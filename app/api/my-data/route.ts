// app/api/my-data/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// DB row shapes (only fields we use)
type ProfileRow = {
  id: string;
  bride_name: string | null;
  groom_name: string | null;
  owner_email: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  profile_id: string;
  type: 'bachelor' | 'bachelorette' | 'wedding';
  date: string;
  start_at: string | null;
  end_at: string | null;
};

type AlbumRow = {
  id: string;
  event_id: string;
  code: string;
  event_slug: string;
  album_slug: 'bachelor' | 'bachelorette' | 'wedding';
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
};

export async function GET(req: NextRequest) {
  // 1) Verify Supabase user from Bearer token (sent by the browser)
  const authz = req.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const email = userData.user.email;

  // 2) Find the latest profile for this owner_email (or all if you prefer)
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('id, bride_name, groom_name, owner_email, created_at')
    .eq('owner_email', email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const profile = (profiles && profiles[0]) as ProfileRow | undefined;
  if (!profile) {
    return NextResponse.json({ profile: null, events: [], albums: [] });
  }

  // 3) Load events for that profile
  const { data: events, error: eErr } = await supabaseAdmin
    .from('events')
    .select('id, profile_id, type, date, start_at, end_at')
    .eq('profile_id', profile.id);
  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

  const eventIds = (events ?? []).map((e) => e.id);
  if (eventIds.length === 0) {
    return NextResponse.json({ profile, events: [], albums: [] });
  }

  // 4) Load albums for those events
  const { data: albums, error: aErr } = await supabaseAdmin
    .from('albums')
    .select('id, event_id, code, event_slug, album_slug, start_at, end_at, is_active')
    .in('event_id', eventIds)
    .eq('is_active', true); // <-- added

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  return NextResponse.json({
    profile,
    events: (events ?? []) as EventRow[],
    albums: (albums ?? []) as AlbumRow[],
  });
}
