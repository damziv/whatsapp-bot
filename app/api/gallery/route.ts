// app/api/gallery/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
// Use service role because you need to list bucket contents

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || '';

  const BUCKET = 'photos'; // change if your bucket has another name
  const prefix = code ? `albums/${code}/` : '';

  const pageSize = 100;
  let offset = 0;
  const all: any[] = [];

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
      if (!f.name) continue; // skip folder placeholders
      all.push(f);
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
