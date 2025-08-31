// app/api/gallery/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// (optional) force Node runtime if you want:
export const runtime = 'nodejs';

type FileRow = {
  name: string;
  created_at?: string;
  updated_at?: string;
  metadata?: { mimetype?: string | null } | null;
};

export async function GET(req: Request) {
  // 👇 Read envs *inside* the handler to avoid build-time crashes
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

  // Prefer service role for private buckets / broad list() access.
  // Fallback to anon for public buckets with permissive policies.
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase envs. Check NEXT_PUBLIC_SUPABASE_URL and a key.');
    return NextResponse.json(
      { items: [], error: 'Supabase configuration missing on the server.' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || '';

  const BUCKET = 'photos'; // change if needed
  const prefix = code ? `albums/${code}/` : '';

  const pageSize = 100;
  let offset = 0;
  const all: FileRow[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: 'created_at', order: 'asc' },
    });

    if (error) {
      console.error('storage.list error', error);
      return NextResponse.json({ items: [], error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;

    for (const f of data) {
      if (!f.name) continue;
      all.push({
        name: f.name,
        created_at: (f as FileRow).created_at,
        updated_at: (f as FileRow).updated_at,
        metadata: (f as FileRow).metadata ?? null,
      });
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  all.sort((a, b) => {
    const da = new Date(a.created_at || a.updated_at || 0).getTime();
    const db = new Date(b.created_at || b.updated_at || 0).getTime();
    return db - da;
  });

  const items = all.map((f) => {
    const path = `${prefix}${f.name}`;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return {
      id: path,
      url: pub.publicUrl,
      created_at: f.created_at || f.updated_at || new Date().toISOString(),
      mime: f.metadata?.mimetype ?? null,
    };
  });

  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}
