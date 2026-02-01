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

type WaImage = { id: string; mime_type?: string; caption?: string };
type WaVideo = { id: string; mime_type?: string; caption?: string };
type WaDocument = { id: string; mime_type?: string; filename?: string; caption?: string };
type WaText = { body?: string };

type WaMessage = {
  from: string;
  type: string; // 'text' | 'image' | 'video' | 'document' | others
  text?: WaText;
  image?: WaImage;
  video?: WaVideo;
  document?: WaDocument;
};

type WaValue = {
  messages?: WaMessage[];
  metadata?: { phone_number_id?: string };
};

type WaBody = {
  entry?: Array<{ changes?: Array<{ value?: WaValue }> }>;
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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function fmt(dt?: string | null) {
  return dt ? new Date(dt).toLocaleString() : 'N/A';
}

function extFromMime(mime: string) {
  const m = (mime || '').toLowerCase();

  // images
  if (m.includes('jpeg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';

  // videos
  if (m === 'video/mp4') return 'mp4';
  if (m === 'video/quicktime') return 'mov';

  const parts = m.split('/');
  return parts[1] || 'bin';
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

/** Normalize embedded relation: PostgREST may send an array; take first or null. */
function normalizeBinding(row: unknown): BindingWithAlbum {
  const r = row as { album_id?: unknown; albums?: unknown };
  const rawAlbums = r?.albums as unknown;
  let albumObj: AlbumRow | null = null;

  if (Array.isArray(rawAlbums)) {
    albumObj = (rawAlbums[0] ?? null) as AlbumRow | null;
  } else if (rawAlbums && typeof rawAlbums === 'object') {
    albumObj = rawAlbums as AlbumRow;
  }

  return {
    album_id: String(r?.album_id ?? ''),
    albums: albumObj,
  };
}

async function getBindingWithAlbum(msisdn: string): Promise<BindingWithAlbum | null> {
  const { data, error } = await supabaseAdmin
    .from('msisdn_bindings')
    .select('album_id, albums:album_id(id, code, event_slug, album_slug, start_at, end_at, is_active)')
    .eq('msisdn', msisdn)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeBinding(data);
}

/**
 * Download WhatsApp media bytes.
 * IMPORTANT: ask for fields explicitly, otherwise `url` can be missing.
 */
async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${mediaId}?fields=url,mime_type`,
    {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN!}` },
    }
  );

  if (!metaRes.ok) {
    const txt = await metaRes.text().catch(() => '');
    throw new Error(`WhatsApp media meta failed (${metaRes.status}): ${txt}`);
  }

  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };

  if (!meta.url) {
    throw new Error('No media URL from WhatsApp');
  }

  const binRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN!}` },
  });

  if (!binRes.ok) {
    const txt = await binRes.text().catch(() => '');
    throw new Error(`WhatsApp media download failed (${binRes.status}): ${txt}`);
  }

  const bin = await binRes.arrayBuffer();
  return Buffer.from(bin);
}

async function sendWhatsApp(waPhoneId: string, toMsisdn: string, text: string) {
  await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toMsisdn,
      type: 'text',
      text: { body: text },
    }),
  });
}

// -------------------- WEBHOOK (POST) --------------------
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as WaBody | null;
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = (value?.messages ?? []) as WaMessage[];
  const waPhoneId = value?.metadata?.phone_number_id;

  if (!waPhoneId) return NextResponse.json({ ok: true });

  await Promise.all(
    messages.map(async (msg) => {
      const from = msg.from;
      const type = msg.type;

      // Accept "document" if it's actually an image/video document
      const isImageDocument = type === 'document' && !!msg.document?.mime_type?.startsWith('image/');
      const isVideoDocument = type === 'document' && !!msg.document?.mime_type?.startsWith('video/');

      if (isImageDocument && msg.document) {
        msg.image = { id: msg.document.id, mime_type: msg.document.mime_type, caption: msg.document.caption };
      }
      if (isVideoDocument && msg.document) {
        msg.video = { id: msg.document.id, mime_type: msg.document.mime_type, caption: msg.document.caption };
      }

      // --- TEXT: ALBUM <code> handler ---
      if (type === 'text') {
        const text = (msg.text?.body || '').trim();
        const m = /^ALBUM\s+([A-Za-z0-9_-]{3,40})$/i.exec(text);
        if (!m) {
          await sendWhatsApp(
            waPhoneId,
            from,
            'Pošalji "ALBUM <code>" kako bi odabrao album (npr., ALBUM K3H9WT). Nakon toga šalji slike ili kratke videe. 📸🎥'
          );
          return;
        }
        const code = m[1].toUpperCase();
        try {
          const album = await getAlbumByCode(code);
          if (!album) {
            await sendWhatsApp(waPhoneId, from, 'Nepoznata šifra albuma. Molimo provjerite i pokušajte ponovno.');
            return;
          }
          if (!album.is_active) {
            await sendWhatsApp(waPhoneId, from, 'Ovaj album nije aktivan.');
            return;
          }
          const now = new Date();
          if (!withinWindow(now, album.start_at, album.end_at)) {
            await sendWhatsApp(waPhoneId, from, 'Ovaj album još uvijek nije otvoren (izvan dozvoljenog vremena).');
            return;
          }
          await upsertBinding(from, album.id);
          await sendWhatsApp(
            waPhoneId,
            from,
            `Album postavljen, nema potrebe ponovno skenirati link ✅
Događaj: ${album.album_slug}
Vrijeme: ${fmt(album.start_at)} → ${fmt(album.end_at)}
Sada šaljite slike ili kratke videe.`
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('album bind error:', message);
          await sendWhatsApp(waPhoneId, from, 'Greška u postavljanju albuma. Molimo pokušajte ponovno.');
        }
        return;
      }

      // --- Only images/videos accepted ---
      const isImage = type === 'image' || isImageDocument;
      const isVideo = type === 'video' || isVideoDocument;

      if (!isImage && !isVideo) {
        await sendWhatsApp(
          waPhoneId,
          from,
          'Dozvoljene su samo slike i kratki videi. 📸🎥\nUpute: pošalji “ALBUM <code>” kako bi odabrao album.'
        );
        return;
      }

      try {
        // Resolve binding
        const binding = await getBindingWithAlbum(from);
        const album = binding?.albums;

        if (!album) {
          // try from caption for first-time users
          const caption = (isImage ? msg.image?.caption : msg.video?.caption)?.trim();
          if (caption) {
            const m2 = /^ALBUM\s+([A-Za-z0-9_-]{3,40})$/i.exec(caption);
            if (m2) {
              const maybe = await getAlbumByCode(m2[1].toUpperCase());
              if (maybe && maybe.is_active && withinWindow(new Date(), maybe.start_at, maybe.end_at)) {
                await upsertBinding(from, maybe.id);
              }
            }
          }
        }

        const binding2 = album ? { albums: album } : await getBindingWithAlbum(from);
        const finalAlbum = binding2?.albums;

        if (!finalAlbum) {
          await sendWhatsApp(
            waPhoneId,
            from,
            'Molimo prvo odaberite album: pošaljite "ALBUM <code>" (skeniraj QR kod).'
          );
          return;
        }

        // Enforce window
        const now = new Date();
        if (!withinWindow(now, finalAlbum.start_at, finalAlbum.end_at)) {
          await sendWhatsApp(waPhoneId, from, 'Ovaj album je trenutno zatvoren. ⏱️');
          return;
        }

        // Media id + mime
        const waMediaId = (isImage ? msg.image?.id : msg.video?.id) as string;
        const mime =
          (isImage ? msg.image?.mime_type : msg.video?.mime_type) ||
          (isImage ? 'image/jpeg' : 'video/mp4');

        // Download & de-dup
        const buf = await downloadWhatsAppMedia(waMediaId);
        const hash = sha256Hex(buf);

        const dup = await supabaseAdmin
          .from('media')
          .select('id')
          .eq('content_hash', hash)
          .limit(1);

        if (!dup.error && dup.data && dup.data.length > 0) {
          await sendWhatsApp(waPhoneId, from, 'Izgleda kao duplikat. Preskočeno. 😉');
          return;
        }

        // Build storage key
        const ext = extFromMime(mime);
        const key = `event/${finalAlbum.event_slug}/${finalAlbum.album_slug}/${cryptoRandom()}.${ext}`;

        const up = await supabaseAdmin.storage.from('media').upload(key, buf, {
          contentType: mime,
          upsert: false,
        });
        if (up.error) throw up.error;

        await supabaseAdmin.from('media').insert({
          storage_key: key,
          uploader_msisdn: from,
          mime,
          bytes: buf.byteLength ?? (buf as any).length ?? null,
          content_hash: hash,
          event_slug: finalAlbum.event_slug,
          album_slug: finalAlbum.album_slug,
        });

        await sendWhatsApp(waPhoneId, from, isVideo ? 'Video postavljen ✔️ Hvala!' : 'Postavljeno ✔️ Hvala!');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Upload error:', message);
        await sendWhatsApp(waPhoneId, from, 'Upss greška. Molimo pokušajte ponovno.');
      }
    })
  );

  return NextResponse.json({ ok: true });
}
