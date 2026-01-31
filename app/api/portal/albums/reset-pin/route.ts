// app/api/portal/albums/reset-pin/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

function getBearer(req: NextRequest) {
  const authz = req.headers.get('authorization') || '';
  return authz.startsWith('Bearer ') ? authz.slice(7) : null;
}

async function getPhotographerByToken(token: string) {
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) return null;

  const { data: photographer } = await supabaseAdmin
    .from('photographers')
    .select('id, is_active')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!photographer || !photographer.is_active) return null;
  return photographer;
}

function pin6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashPin(pin: string) {
  const salt = process.env.OWNER_PIN_SALT || 'dev-salt';
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

export async function POST(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const photographer = await getPhotographerByToken(token);
  if (!photographer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | { code: string };
  const code = (body?.code || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  // Ensure album belongs to this photographer (albums -> events -> profiles)
  const { data: albumRow, error: albErr } = await supabaseAdmin
    .from('albums')
    .select('id, code, event_id, events:event_id(profile_id, profiles:profile_id(photographer_id))')
    .eq('code', code)
    .maybeSingle();

  if (albErr) return NextResponse.json({ error: albErr.message }, { status: 500 });
  if (!albumRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // PostgREST nested relation may return arrays depending on schema; normalize lightly
  const eventsRel: any = (albumRow as any).events;
  const ev = Array.isArray(eventsRel) ? eventsRel[0] : eventsRel;
  const profilesRel: any = ev?.profiles;
  const prof = Array.isArray(profilesRel) ? profilesRel[0] : profilesRel;

  if (!prof?.photographer_id || prof.photographer_id !== photographer.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Reset PIN
  const newPin = pin6();
  const newHash = hashPin(newPin);

  const { error: upErr } = await supabaseAdmin
    .from('albums')
    .update({
      owner_pin_hash: newHash,
      owner_pin_set_at: new Date().toISOString(),
    })
    .eq('id', (albumRow as any).id);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    code,
    owner_pin: newPin,
  });
}
