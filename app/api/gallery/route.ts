// app/api/gallery/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// How long signed URLs stay valid (seconds)
const SIGNED_SECONDS = 60 * 60; // 1 hour

type MediaRow = {
  id: string;
  storage_key: string;
  created_at: string;
  mime: string | null;
  event_slug?: string | null;
  album_slug?: string | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  let filter: { event_slug?: string; album_slug?: string } = {};

  if (code) {
    const { data: album, error: albErr } = await supabaseAdmin
      .from('albums')
      .select('event_slug, album_slug')
      .eq('code', code)
      .maybeSingle();

    if (albErr) {
      return NextResponse.json({ error: albErr.message }, { status: 500 });
    }
    if (!album) {
      return NextResponse.json({ items: [] });
    }

    filter = { event_slug: album.event_slug, album_slug: album.album_slug };
  }

  let query = supabaseAdmin
    .from('media')
    .select('id, storage_key, created_at, mime, event_slug, album_slug')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filter.event_slug && filter.album_slug) {
    query = query
      .eq('event_slug', filter.event_slug)
      .eq('album_slug', filter.album_slug);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as MediaRow[];
  const items: { id: string; url: string; created_at: string; mime: string | null }[] = [];

  for (const r of rows) {
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from('media')
      .createSignedUrl(r.storage_key, SIGNED_SECONDS);

    if (signErr || !signed?.signedUrl) continue;

    items.push({
      id: r.id,
      url: signed.signedUrl,
      created_at: r.created_at,
      mime: r.mime,
    });
  }

  return NextResponse.json({ items });
}
