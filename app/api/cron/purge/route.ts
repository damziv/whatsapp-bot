// app/api/cron/purge/route.ts
// Scheduled cleanup, run by Vercel Cron (see vercel.json). Two jobs:
//   1) 2-month retention — delete media whose expires_at has passed.
//      (Only new uploads get expires_at, so pre-existing photos are grandfathered.)
//   2) Post-download wipe — for albums whose download_purge_at has passed
//      (24h after the couple downloaded the ZIP), delete ALL of that album's media.
//
// Secured by CRON_SECRET: Vercel sends it as `Authorization: Bearer <CRON_SECRET>`.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'media';

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

type MediaRow = { id: string; storage_key: string };

/** Remove the given media from storage and the media table, in chunks. */
async function removeMedia(rows: MediaRow[]) {
  const CHUNK = 200;

  const keys = rows.map((r) => r.storage_key).filter(Boolean);
  for (let i = 0; i < keys.length; i += CHUNK) {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove(keys.slice(i, i + CHUNK));
    if (error) console.error('cron storage remove error:', error.message);
  }

  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabaseAdmin.from('media').delete().in('id', ids.slice(i, i + CHUNK));
    if (error) console.error('cron rows delete error:', error.message);
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const nowIso = new Date().toISOString();
  let expiredDeleted = 0;
  let downloadDeleted = 0;

  // 1) Expired media (2-month retention). Page through in case there are many.
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('media')
      .select('id, storage_key')
      .not('expires_at', 'is', null)
      .lte('expires_at', nowIso)
      .limit(1000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as MediaRow[];
    if (rows.length === 0) break;
    await removeMedia(rows);
    expiredDeleted += rows.length;
    if (rows.length < 1000) break;
  }

  // 2) Albums scheduled for purge 24h after download.
  const { data: albums, error: albErr } = await supabaseAdmin
    .from('albums')
    .select('id, event_slug, album_slug')
    .not('download_purge_at', 'is', null)
    .lte('download_purge_at', nowIso);
  if (albErr) return NextResponse.json({ error: albErr.message }, { status: 500 });

  for (const a of (albums ?? []) as { id: string; event_slug: string; album_slug: string }[]) {
    const { data: media, error: mErr } = await supabaseAdmin
      .from('media')
      .select('id, storage_key')
      .eq('event_slug', a.event_slug)
      .eq('album_slug', a.album_slug)
      .limit(10000);
    if (mErr) {
      console.error('cron album media fetch error:', mErr.message);
      continue;
    }
    const rows = (media ?? []) as MediaRow[];
    await removeMedia(rows);
    downloadDeleted += rows.length;

    // Clear the flag so the album isn't purged again.
    await supabaseAdmin.from('albums').update({ download_purge_at: null }).eq('id', a.id);
  }

  return NextResponse.json({ ok: true, expiredDeleted, downloadDeleted });
}
