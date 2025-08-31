// app/api/gallery/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type FileRow = {
  name: string;
  updated_at?: string;
  metadata?: { mimetype?: string | null } | null;
};

function getEnv(name: string) {
  return process.env[name] ?? '';
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';
  const limit = Math.max(1, Math.min( Number(url.searchParams.get('limit') ?? 60), 200 )); // default 60
  const offset = Math.max(0, Number(url.searchParams.get('cursor') ?? 0)); // offset as cursor

  const supabaseUrl =
    getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
  const supabaseKey =
    getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getEnv('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase envs missing.');
    return NextResponse.json({ items: [], nextCursor: null, error: 'Supabase envs missing' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const BUCKET = 'photos';            // adjust if different
  const prefix = code ? `albums/${code}/` : '';

  // Storage list supports sorting by "name" or "updated_at".
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit,
    offset,
    sortBy: { column: 'updated_at', order: 'desc' }, // newest first
  });

  if (error) {
    console.error('storage.list error', error);
    return NextResponse.json({ items: [], nextCursor: null, error: error.message }, { status: 500 });
  }

  const files: FileRow[] = (data ?? []).filter((f) => !!f.name) as FileRow[];

  // If your bucket is PUBLIC:
  const publicItems = files.map((f) => {
    const path = `${prefix}${f.name}`;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return {
      id: path,
      url: pub.publicUrl,
      created_at: f.updated_at ?? new Date().toISOString(),
      mime: f.metadata?.mimetype ?? null,
    };
  });

  // If your bucket is PRIVATE, use bulk signed URLs instead of getPublicUrl above:
  // const paths = files.map((f) => `${prefix}${f.name}`);
  // const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  // if (signErr) { ...handle... }
  // const privateItems = signed!.map((s, i) => ({
  //   id: paths[i],
  //   url: s.signedUrl,
  //   created_at: files[i].updated_at ?? new Date().toISOString(),
  //   mime: files[i].metadata?.mimetype ?? null,
  // }));

  const hasMore = files.length === limit;
  const nextCursor = hasMore ? offset + limit : null;

  return NextResponse.json(
    { items: publicItems, nextCursor },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
