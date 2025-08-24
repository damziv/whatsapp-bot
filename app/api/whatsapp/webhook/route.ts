// app/api/whatsapp/webhook/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// -------------------- VERIFY (GET) --------------------
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// -------------------- TYPES --------------------
type AlbumRow = {
  id: string;
  code: string;
  event_slug: string;
  album_slug: string;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
};

type BindingWithAlbum = {
  album_id: string;
  albums: AlbumRow | null;
};

// -------------------- HELPERS --------------------
function sha256Hex(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function withinWindow(now: Date, start?: string | null, end?: string | null) {
  if (!start && !end) return true;
  const t = now.getTime();
  if (start && t < new Date(start).getTime()) return false;
  if (end && t > new Date(end).getTime()) return false;
  return true;
}

function cryptoRandom() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function fmt(dt?: string | null) {
  return dt ? new Date(dt).toLocaleString() : 'N/A';
}

async function getAlbumByCode(code: string): Promise<AlbumRow | null> {
  const { data, error } = await supabaseAdmin
    .from('albums')
    .select('id, code, event_slug, album_slug, start_at, end_at, is_active')
    .eq('code', code)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as AlbumRow | null;
}

async function upsertBinding(msisdn: string, album_id: string) {
  const { error } = await supabaseAdmin
    .from('msisdn_bindings')
    .upsert({ msisdn, album_id, bound_at: new Date().toISOString() });
  if (error) throw error;
}

/**
 * PostgREST sometimes returns embedded relations as arrays when types aren’t generated.
 * Normalize the shape so .albums is a single AlbumRow or null.
 */
function normalizeBinding(row: any): BindingWithAlbum {
  const rawAlbums = row?.albums;
  const albumObj: AlbumRow | null = Array.isArray(rawAlbums)
    ? (rawAlbums[0] ?? null)
    : (rawAlbums ?? null);
  return {
    album_id: String(row?.album_id ?? ''),
    albums: albumObj,
  };
}

async function getBindingWithAlbum(msisdn: string): Promise<BindingWithAlbum | null> {
  const { data, error } = await supabaseAdmin
    .from('msisdn_bindings')
    .select(
      'album_id, albums:album_id(id, code, event_slug, album_slug, start_at, end_at, is_active)'
    )
    .eq('msisdn', msisdn)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeBinding(data);
}

async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  // step 1: get a temporary URL for the media
  const meta = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN!}` }
  }).then(r => r.json());

  if (!meta?.url) throw new Error('No media URL from WhatsApp');

  // step 2: download binary using the token
  const bin = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN!}` }
  }).then(r => r.arrayBuffer());

  return Buffer.from(bin);
}

async function sendWhatsApp(waPhoneId: string, toMsisdn: string, text: string) {
  await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN!}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toMsisdn,
      type: 'text',
      text: { body: text }
    })
  });
}

// -------------------- WEBHOOK (POST) --------------------
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages ?? [];
  const waPhoneId = value?.metadata?.phone_number_id as string | undefined;

  if (!waPhoneId) return NextResponse.json({ ok: true });

  await Promise.all(
    messages.map(async (msg: any) => {
      const from = msg.from as string;
      const type = msg.type as string;

      // --- TEXT: ALBUM <code> handler ---
      if (type === 'text') {
        const text: string = (msg.text?.body || '').trim();
        const m = /^ALBUM\s+([A-Za-z0-9_-]{3,40})$/i.exec(text);
        if (!m) {
          await sendWhatsApp(
            waPhoneId,
            from,
            'Send "ALBUM <code>" to choose an album (e.g., ALBUM K3H9WT). Then send photos here. 📸'
          );
          return;
        }
        const code = m[1].toUpperCase();
        try {
          const album = await getAlbumByCode(code);
          if (!album) {
            await sendWhatsApp(waPhoneId, from, 'Unknown album code. Please check and try again.');
            return;
          }
          if (!album.is_active) {
            await sendWhatsApp(waPhoneId, from, 'This album is inactive.');
            return;
          }
          const now = new Date();
          if (!withinWindow(now, album.start_at, album.end_at)) {
            await sendWhatsApp(
              waPhoneId,
              from,
              'This album is closed for uploads (outside the allowed time window).'
            );
            return;
          }
          await upsertBinding(from, album.id);
          await sendWhatsApp(
            waPhoneId,
            from,
            `Album set ✅
Event: ${album.album_slug}
Window: ${fmt(album.start_at)} → ${fmt(album.end_at)}
Now send your photos here.`
          );
        } catch (e: any) {
          console.error('album bind error:', e?.message || e);
          await sendWhatsApp(waPhoneId, from, 'Error setting album. Please try again.');
        }
        return;
      }

      // --- Only images accepted for MVP ---
      if (type !== 'image') {
        await sendWhatsApp(
          waPhoneId,
          from,
          'Only photos are allowed for this gallery. 📸\nTip: send “ALBUM <code>” first to choose an album.'
        );
        return;
      }

      try {
        // Resolve binding
        const binding = await getBindingWithAlbum(from);
        const album = binding?.albums;
        if (!album) {
          await sendWhatsApp(waPhoneId, from, 'Please choose an album first: send "ALBUM <code>" (see QR code).');
          return;
        }

        // Enforce window
        const now = new Date();
        if (!withinWindow(now, album.start_at, album.end_at)) {
          await sendWhatsApp(waPhoneId, from, 'This album is currently closed for uploads. ⏱️');
          return;
        }

        // Download & (optional) de-dup
        const media = msg.image; // { id, mime_type }
        const waMediaId = media.id as string;
        const mime = (media.mime_type as string) || 'image/jpeg';
        const buf = await downloadWhatsAppMedia(waMediaId);
        const hash = sha256Hex(buf);

        const dup = await supabaseAdmin
          .from('media')
          .select('id')
          .eq('content_hash', hash)
          .limit(1);
        if (!dup.error && dup.data && dup.data.length > 0) {
          await sendWhatsApp(waPhoneId, from, 'Looks like a duplicate photo. Skipped. 😉');
          return;
        }

        // Build path with slugs
        const ext = mime.includes('jpeg') ? 'jpg' : (mime.split('/')[1] || 'bin');
        const key = `event/${album.event_slug}/${album.album_slug}/${cryptoRandom()}.${ext}`;

        const up = await supabaseAdmin.storage.from('media').upload(key, buf, {
          contentType: mime,
          upsert: false
        });
        if (up.error) throw up.error;

        await supabaseAdmin.from('media').insert({
          storage_key: key,
          uploader_msisdn: from,
          mime,
          bytes: buf.byteLength ?? buf.length ?? null,
          content_hash: hash,
          event_slug: album.event_slug,
          album_slug: album.album_slug
        });

        await sendWhatsApp(waPhoneId, from, 'Uploaded ✔️ Thanks!');
      } catch (e: any) {
        console.error('Upload error:', e?.message || e);
        await sendWhatsApp(waPhoneId, from, 'Upload failed. Please try again.');
      }
    })
  );

  return NextResponse.json({ ok: true });
}
