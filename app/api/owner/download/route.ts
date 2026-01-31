export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import archiver from 'archiver';
import { PassThrough, Readable } from 'node:stream';
import { supabaseAdmin } from '@/lib/supabase-admin';

function base64urlToBuf(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function verifyOwnerToken(token: string) {
  const secret = process.env.OWNER_SESSION_SECRET || process.env.OWNER_PIN_SALT || 'dev-secret';

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;

  const data = `${h}.${p}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest();
  const got = base64urlToBuf(sig);

  if (expected.length !== got.length) return null;
  if (!crypto.timingSafeEqual(expected, got)) return null;

  const payload = JSON.parse(base64urlToBuf(p).toString('utf8')) as any;
  if (!payload?.exp || typeof payload.exp !== 'number') return null;
  if (Date.now() / 1000 > payload.exp) return null;

  if (!payload?.album_id) return null;
  return payload as { album_id: string; code: string; exp: number };
}

function getBearer(req: NextRequest) {
  const authz = req.headers.get('authorization') || '';
  return authz.startsWith('Bearer ') ? authz.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyOwnerToken(token);
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const code = (searchParams.get('code') || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  // Ensure token album matches code album
  const { data: album, error: albErr } = await supabaseAdmin
    .from('albums')
    .select('id, code, event_slug, album_slug')
    .eq('code', code)
    .maybeSingle();

  if (albErr) return NextResponse.json({ error: albErr.message }, { status: 500 });
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });

  if (album.id !== payload.album_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load all media rows for this album (DB)
  const { data: rows, error: mErr } = await supabaseAdmin
    .from('media')
    .select('id, storage_key, created_at, mime, event_slug, album_slug')
    .eq('event_slug', album.event_slug)
    .eq('album_slug', album.album_slug)
    .order('created_at', { ascending: true });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const list = rows ?? [];
  if (list.length === 0) {
    return NextResponse.json({ error: 'No photos to download' }, { status: 400 });
  }

  const zipName = `album_${code}.zip`;

  // Streaming ZIP
  const pass = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    console.error('zip error:', err);
    pass.destroy(err);
  });

  archive.pipe(pass);

  // Start async pumping of files
  (async () => {
    try {
      let i = 1;
      for (const r of list) {
        const storageKey = (r as any).storage_key as string;
        const mime = ((r as any).mime as string) || 'image/jpeg';

        const ext =
          mime.includes('jpeg') ? 'jpg' :
          mime.includes('png') ? 'png' :
          mime.includes('webp') ? 'webp' :
          (storageKey.split('.').pop() || 'bin');

        const filename = `${String(i).padStart(4, '0')}.${ext}`;
        i++;

        const dl = await supabaseAdmin.storage.from('media').download(storageKey);
        if (dl.error || !dl.data) {
          console.error('download failed:', dl.error?.message);
          continue;
        }

        // dl.data is a Blob in node env (supabase-js). Convert to Buffer:
        const ab = await dl.data.arrayBuffer();
        const buf = Buffer.from(ab);

        archive.append(buf, { name: filename });
      }
      await archive.finalize();
    } catch (e) {
      console.error('zip build failed:', e);
      pass.destroy(e as any);
    }
  })();

  const webStream = Readable.toWeb(pass) as unknown as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
