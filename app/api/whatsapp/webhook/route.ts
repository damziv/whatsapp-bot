import { NextRequest, NextResponse } from 'next/server';

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
  console.log('Incoming webhook:', JSON.stringify(body, null, 2));

  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages ?? [];
  const waPhoneId = value?.metadata?.phone_number_id as string | undefined;

  for (const msg of messages) {
    const from = msg.from as string;
    const type = msg.type as string;

    if (type === 'image') {
      await sendWhatsApp(waPhoneId!, from, '✅ Got your photo! (Not stored yet — just testing)');
    } else {
      await sendWhatsApp(waPhoneId!, from, '👋 Webhook connected. Please send a photo.');
    }
  }

  return NextResponse.json({ ok: true });
}

async function sendWhatsApp(waPhoneId: string, toMsisdn: string, text: string) {
  if (!waPhoneId) return;
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
