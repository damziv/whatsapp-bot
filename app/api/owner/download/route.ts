import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBearer(req: NextRequest) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

function base64urlToBuffer(input: string) {
  const pad = 4 - (input.length % 4 || 4);
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return Buffer.from(b64, 'base64');
}

function safeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyOwnerToken(token: string) {
  const secret = process.env.OWNER_SESSION_SECRET || process.env.OWNER_PIN_SALT || 'dev-secret';

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');

  const [h, p, s] = parts;
  const data = `${h}.${p}`;

  const expected = crypto.createHmac('sha256', secret).update(data).digest();
  const got = base64urlToBuffer(s);

  if (!safeEqual(expected, got)) throw new Error('Invalid token signature');

  const payloadJson = base64urlToBuffer(p).toString('utf8');
  const payload = JSON.parse(payloadJson) as { sub?: string; code?: string; exp?: number; album_id?: string };

  if (payload.sub !== 'owner') throw new Error('Invalid token subject');
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');

  return payload;
}

function extFromMime(mime?: string | null) {
  if (!mime) return '';
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/heic' || mime === 'image/heif') return '.heic';
  if (mime === 'video/mp4') return '.mp4';
  return '';
}

function safeName(s: string) {
  return s.replace(/[^\w.-]+/g, '_').slice(0, 140);
}

export async function GET(req: NextRequest) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || '').toUpperCase();
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    const payload = verifyOwnerToken(token);
    if (!payload.code || payload.code.toUpperCase() !== code) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Load album to get event_slug / album_slug
    const { data: album, error: albumErr } = await supabaseAdmin
      .from('albums')
      .select('id, code, event_slug, album_slug')
      .eq('code', code)
      .maybeSingle();

    if (albumErr) return NextResponse.json({ error: albumErr.message }, { status: 500 });
    if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });

    // Optional: ensure token album_id matches album.id (extra safety)
    if (payload.album_id && payload.album_id !== album.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const eventSlug = album.event_slug;
    const albumSlug = album.album_slug;
    if (!eventSlug || !albumSlug) {
      return NextResponse.json({ error: 'Album slugs missing' }, { status: 500 });
    }

    // Fetch media for that album
    const { data: media, error: mediaErr } = await supabaseAdmin
      .from('media')
      .select('id, storage_key, mime, created_at')
      .eq('event_slug', eventSlug)
      .eq('album_slug', albumSlug)
      .order('created_at', { ascending: true });

    if (mediaErr) return NextResponse.json({ error: mediaErr.message }, { status: 500 });
    if (!media || media.length === 0) return NextResponse.json({ error: 'No media to download' }, { status: 404 });

    const bucket = process.env.SUPABASE_MEDIA_BUCKET || 'media';

    // Build zip stream (Node) -> Web stream
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('warning', (err) => console.warn('zip warning:', err));
    archive.on('error', (err) => {
      console.error('zip error:', err);
      // archiver will cause stream to error; request will fail naturally
    });

    for (let i = 0; i < media.length; i++) {
      const it = media[i] as {
        id: string;
        storage_key: string;
        mime?: string | null;
        created_at?: string | null;
      };

      const created = it.created_at ? new Date(it.created_at) : null;
      const stamp = created
        ? created.toISOString().replace(/[:.]/g, '-')
        : `idx-${String(i + 1).padStart(4, '0')}`;

      const ext = extFromMime(it.mime);
      const fileName = safeName(`${stamp}_${it.id}${ext}`);

      // Signed URL for private/public buckets
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(it.storage_key, 60 * 10);

      if (signErr || !signed?.signedUrl) {
        archive.append(
          `Could not sign ${bucket}/${it.storage_key}: ${signErr?.message || 'unknown'}\n`,
          { name: `errors/${it.id}.txt` }
        );
        continue;
      }

      const r = await fetch(signed.signedUrl);
      if (!r.ok || !r.body) {
        archive.append(
          `Download failed (${r.status}) for ${bucket}/${it.storage_key}\n`,
          { name: `errors/${it.id}.txt` }
        );
        continue;
      }

      const nodeStream = Readable.fromWeb(r.body as any);
      archive.append(nodeStream, { name: fileName });
    }

    archive.finalize();

    const webStream = Readable.toWeb(archive as any) as ReadableStream;

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="album_${code}.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || 'Download failed' }, { status: 500 });
  }
}