// app/api/twilio/inbound-sms/route.ts
export const runtime = 'nodejs';                // ensure Node runtime (not Edge)
export const dynamic = 'force-dynamic';         // avoid static optimization

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Use namespace import to avoid ESM/CJS issues
import * as twilio from 'twilio';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!; // e.g. https://your-domain.com

export async function POST(req: Request) {
  // Twilio posts application/x-www-form-urlencoded
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  // Verify Twilio signature
  const signature = (req.headers.get('x-twilio-signature') || '').toString();
  const url = `${PUBLIC_BASE_URL}/api/twilio/inbound-sms`;
  const isValid = twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, url, params);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const from = params.From; // E.164
  const body = (params.Body || '').trim().toUpperCase();

  // Build TwiML reply helper
  const reply = (text: string) => {
    const resp = new twilio.twiml.MessagingResponse();
    resp.message(text);
    return new NextResponse(resp.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  };

  // Keywords
  if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(body)) {
    await supabase
      .from('guests')
      .update({ status: 'cancelled' })
      .eq('phone_e164', from)
      .neq('status', 'cancelled');
    return reply('Odjavljeni ste. Nećemo više slati poruke.');
  }

  if (['START', 'UNSTOP'].includes(body)) {
    await supabase
      .from('guests')
      .update({ status: 'pending' })
      .eq('phone_e164', from)
      .eq('status', 'cancelled');
    return reply('Ponovno ste prijavljeni. Primat ćete obavijesti.');
  }

  if (['HELP', 'INFO'].includes(body)) {
    return reply('Photo bot: otvorite WhatsApp link iz SMS-a i pošaljite fotke. Odjava: STOP.');
  }

  // Default: acknowledge without reply
  return NextResponse.json({ ok: true });
}
