// app/api/album/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  // Pull album + event.profile_id + profile names in one query (same idea as portal DELETE)
  const { data: row, error } = await supabaseAdmin
    .from('albums')
    .select(
      `
      code, event_slug, album_slug, start_at, end_at, is_active,
      events:event_id(
        profile_id,
        profiles:profile_id(
          bride_name,
          groom_name
        )
      )
    `
    )
    .eq('code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const labels: Record<string, string> = {
    wedding: 'Wedding',
    bachelor: 'Bachelor Party',
    bachelorette: 'Bachelorette Party',
  };

  const bride_name = (row as any)?.events?.profiles?.bride_name ?? null;
  const groom_name = (row as any)?.events?.profiles?.groom_name ?? null;

  return NextResponse.json({
    code: (row as any).code,
    event_slug: (row as any).event_slug,
    album_slug: (row as any).album_slug,
    label: labels[(row as any).album_slug] ?? (row as any).album_slug,
    start_at: (row as any).start_at ?? null,
    end_at: (row as any).end_at ?? null,
    is_active: (row as any).is_active,
    bride_name,
    groom_name,
  });
}
