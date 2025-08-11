export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
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
};

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('media')
    .select('id, storage_key, created_at, mime')
    .order('created_at', { ascending: false })
    .limit(100);

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
