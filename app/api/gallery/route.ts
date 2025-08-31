// app/api/gallery/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { FileObject } from '@supabase/storage-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function env(name: string) {
  return process.env[name] ?? '';
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';

  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL') || env('SUPABASE_URL');
  const supabaseKey =
    env('SUPABASE_SERVICE_ROLE_KEY') ||
    env('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    env('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase envs');
    return NextResponse.json({ items: [], error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const BUCKET = 'photos'; // change if different
  const prefix = code ? `albums/${code}/` : '';

  const pageSize = 1000; // Supabase max per call
  let offset = 0;
  const collected: FileObject[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: pageSize,
      offset,
      // 'name' sort is safest for compatibility
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error('storage.list error', error);
      return NextResponse.json({ items: [], error: error.message }, { status: 500 });
    }

    const batch = (data ?? []).filter((f) => !!f.name); // keep files, skip folders
    if (batch.length === 0) break;

    collected.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  // Map to your front-end contract
  const items = collected.map((f) => {
    const path = `${prefix}${f.name}`;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path); // for PUBLIC bucket
    return {
      id: path,
      url: pub.publicUrl,
      created_at: f.updated_at ?? f.created_at ?? new Date().toISOString(),
      mime: (f.metadata as { mimetype?: string } | null)?.mimetype ?? null,
    };
  });

  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}
