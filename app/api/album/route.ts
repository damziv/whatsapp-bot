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

  const { data, error } = await supabaseAdmin
    .from('albums')
    .select('code, event_slug, album_slug, start_at, end_at, is_active')
    .eq('code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Optional: map slug to pretty label
  const labels: Record<string, string> = {
    wedding: 'Wedding',
    bachelor: 'Bachelor Party',
    bachelorette: 'Bachelorette Party',
  };

  return NextResponse.json({
    code: data.code,
    event_slug: data.event_slug,
    album_slug: data.album_slug,
    label: labels[data.album_slug] ?? data.album_slug,
    start_at: data.start_at,
    end_at: data.end_at,
    is_active: data.is_active,
  });
}
