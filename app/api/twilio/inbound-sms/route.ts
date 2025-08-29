// app/api/twilio/inbound-sms/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as twilio from 'twilio';

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!; // e.g. https://your-domain.com

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  // no session stuff on server
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  // Twilio posts application/x-www-form-urlencoded
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  // Verify Twilio signature
  const signature = (req.headers.get('x-twilio-signature') || '').toString();
  const url = `${PUBLIC_BASE_URL}/api/twilio/inbound-sms`;
  const isValid = twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, url, params);
  if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  const supabase = getAdminSupabase(); // <-- create client at runtime

  const from = params.From; // E.164
  const body = (params.Body || '').trim().toUpperCase();

  const reply = (text: string) => {
    const resp = new twilio.twiml.MessagingResponse();
    resp.message(text);
    return new NextResponse(resp.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  };

  if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(body)) {
    await supabase.from('guests')
      .update({ status: 'cancelled' })
      .eq('phone_e164', from)
      .neq('status', 'cancelled');
    return reply('Odjavljeni ste. Nećemo više slati poruke.');
  }

  if (['START', 'UNSTOP'].includes(body)) {
    await supabase.from('guests')
      .update({ status: 'pending' })
      .eq('phone_e164', from)
      .eq('status', 'cancelled');
    return reply('Ponovno ste prijavljeni. Primat ćete obavijesti.');
  }

  if (['HELP', 'INFO'].includes(body)) {
    return reply('Photo bot: otvorite WhatsApp link iz SMS-a i pošaljite fotke. Odjava: STOP.');
  }

  return NextResponse.json({ ok: true });
}
