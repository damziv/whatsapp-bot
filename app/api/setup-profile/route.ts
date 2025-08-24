// app/api/setup-profile/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// Your WhatsApp number in international format, digits only (no +)
const WABA_NUMBER = process.env.WHATSAPP_NUMBER_DIGITS!; // e.g. "15551234567"

// --- Helpers ---
function code7() {
  // URL-safe base32-ish, 7 chars => ~35 bits space; unique constraint will guard collisions
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 7; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// Given YYYY-MM-DD, compute a UTC window [date-24h, date+24h]
function computeUtcWindow(isoDate: string) {
  // Date.parse('YYYY-MM-DD') is 00:00:00 UTC for that day
  const anchor = new Date(isoDate + 'T00:00:00Z').getTime();
  const start = new Date(anchor - 24 * 3600 * 1000).toISOString();
  const end = new Date(anchor + 24 * 3600 * 1000).toISOString();
  return { start_at: start, end_at: end };
}

type Body = {
  brideName: string;
  groomName: string;
  weddingDate: string;        // "YYYY-MM-DD"
  bachelorDate?: string | null;
  bacheloretteDate?: string | null;
  ownerEmail?: string | null; // optional if you want to link to auth user
};

type CreatedAlbum = {
  type: 'bachelor' | 'bachelorette' | 'wedding';
  label: string;
  code: string;
  event_slug: string;
  album_slug: string;
  start_at: string;
  end_at: string;
  wa_link: string;
  share_link: string;
  gallery_link: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const { brideName, groomName, weddingDate, bachelorDate, bacheloretteDate, ownerEmail } = body;
    if (!brideName || !groomName || !weddingDate) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const origin = req.nextUrl.origin; // e.g. https://yourdomain.com

    // 1) Create profile
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .insert({ bride_name: brideName, groom_name: groomName, owner_email: ownerEmail ?? null })
      .select('id')
      .single();
    if (profErr) throw profErr;

    const profileId = prof.id as string;
    const profileTag = profileId.replace(/-/g, '').slice(-6); // for event_slug

    type NewEvent = { type: 'bachelor'|'bachelorette'|'wedding'; date: string; label: string };
    const newEvents: NewEvent[] = [
      { type: 'wedding', date: weddingDate, label: 'Wedding' },
    ];
    if (bachelorDate) newEvents.push({ type: 'bachelor', date: bachelorDate, label: 'Bachelor Party' });
    if (bacheloretteDate) newEvents.push({ type: 'bachelorette', date: bacheloretteDate, label: 'Bachelorette Party' });

    const createdAlbums: CreatedAlbum[] = [];

    for (const ev of newEvents) {
      const { start_at, end_at } = computeUtcWindow(ev.date);

      // 2) Insert event (unique per profile/type)
      const { data: evRow, error: evErr } = await supabase
        .from('events')
        .insert({
          profile_id: profileId,
          type: ev.type,
          date: ev.date,
          start_at,
          end_at
        })
        .select('id')
        .single();
      if (evErr) throw evErr;

      const eventId = evRow.id as string;

      // 3) Create album with unique short code
      let code: string | null = null;
      for (let i = 0; i < 5; i++) {
        const candidate = code7();
        const { error: insertErr } = await supabase
          .from('albums')
          .insert({
            event_id: eventId,
            code: candidate,
            event_slug: `p_${profileTag}`,
            album_slug: ev.type,
            start_at,
            end_at,
            is_active: true
          });
        if (!insertErr) { code = candidate; break; }
        if (!insertErr.message || insertErr.message.includes('duplicate key')) {
          continue; // try next candidate on duplicate; otherwise throw below
        } else {
          throw insertErr;
        }
      }
      if (!code) throw new Error('Failed to allocate album code');

      const wa_link = `https://wa.me/${WABA_NUMBER}?text=${encodeURIComponent('ALBUM ' + code)}`;
      const share_link = `${origin}/w?code=${encodeURIComponent(code)}`;
      const gallery_link = `${origin}/gallery?code=${encodeURIComponent(code)}`;

      createdAlbums.push({
        type: ev.type,
        label: ev.label,
        code,
        event_slug: `p_${profileTag}`,
        album_slug: ev.type,
        start_at,
        end_at,
        wa_link,
        share_link,
        gallery_link
      });
    }

    return NextResponse.json({
      profile: { id: profileId, bride_name: brideName, groom_name: groomName },
      albums: createdAlbums
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('setup-profile error:', message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
