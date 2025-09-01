// app/api/gallery/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE! // keep your env name
);

// How long signed URLs stay valid (seconds)
const SIGNED_SECONDS = 60 * 60; // 1 hr

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

  // 1) Resolve album to (event_slug, album_slug) if code provided
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

  // 2) Page through ALL media rows (no hard 100 limit)
  const PAGE = 1000; // PostgREST max per page; loop to get everything
  let from = 0;
  const rows: MediaRow[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = supabaseAdmin
      .from('media')
      .select('id, storage_key, created_at, mime, event_slug, album_slug')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);

    if (filter.event_slug && filter.album_slug) {
      q = q.eq('event_slug', filter.event_slug).eq('album_slug', filter.album_slug);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const batch = (data ?? []) as MediaRow[];
    rows.push(...batch);

    if (batch.length < PAGE) break; // finished
    from += PAGE;
  }

  if (rows.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // 3) Bulk-sign URLs in chunks (fast). Avoid N calls in a loop.
  const paths = rows.map((r) => r.storage_key);
  const CHUNK = 200; // safe chunk size; increase if you like
  const items: { id: string; url: string; created_at: string; mime: string | null }[] = [];

  for (let i = 0; i < paths.length; i += CHUNK) {
    const slice = paths.slice(i, i + CHUNK);
    const { data: signedBatch, error: signErr } = await supabaseAdmin.storage
      .from('media') // bucket name
      .createSignedUrls(slice, SIGNED_SECONDS);

    if (signErr) {
      // If signing fails for a chunk, skip it rather than failing the whole response
      console.error('createSignedUrls error:', signErr.message);
      continue;
    }

    (signedBatch ?? []).forEach((s, j) => {
      const row = rows[i + j];
      if (!s?.signedUrl || !row) return;
      items.push({
        id: row.id,
        url: s.signedUrl,
        created_at: row.created_at,
        mime: row.mime,
      });
    });
  }

  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}
