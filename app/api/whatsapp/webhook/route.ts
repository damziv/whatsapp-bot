import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages ?? [];
  const waPhoneId = value?.metadata?.phone_number_id as string | undefined;

  for (const msg of messages) {
    const from = msg.from as string;          // sender (msisdn)
    const type = msg.type as string;

    // allow only images for MVP
    if (type !== 'image') {
      await sendWhatsApp(waPhoneId!, from, 'Only photos are allowed for this gallery. 📸');
      continue;
    }

    try {
      const media = msg.image; // { id, mime_type, caption? }
      const waMediaId = media.id as string;
      const mime = (media.mime_type as string) || 'image/jpeg';

      // 1) download binary from WhatsApp
      const fileBuf = await downloadWhatsAppMedia(waMediaId);

      // 2) build a storage path
      const ext = mime.includes('jpeg') ? 'jpg' : (mime.split('/')[1] || 'bin');
      const key = `event/default/${cryptoRandom()}.${ext}`;

      // 3) upload to Supabase Storage (private bucket)
      const up = await supabaseAdmin.storage.from('media')
        .upload(key, fileBuf, { contentType: mime, upsert: false });
      if (up.error) throw up.error;

      // 4) insert DB row
      await supabaseAdmin.from('media').insert({
        storage_key: key,
        uploader_msisdn: from,
        mime,
        bytes: fileBuf.byteLength ?? fileBuf.length ?? null
      });

      // 5) confirm to user
      await sendWhatsApp(waPhoneId!, from, 'Uploaded ✔️ Thanks!');

    } catch (e: any) {
      console.error('Upload error:', e?.message || e);
      await sendWhatsApp(waPhoneId!, from, 'Upload failed. Please try again.');
    }
  }

  return NextResponse.json({ ok: true });
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

function cryptoRandom() {
  // tiny uuid-like for file names (avoid importing crypto just for this)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
