// app/(app)/api/admin/albums/reset-pin/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

function getBearer(req: NextRequest) {
  const authz = req.headers.get('authorization') || '';
  return authz.startsWith('Bearer ') ? authz.slice(7) : null;
}

async function requireAdmin(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const userId = userData.user.id;

  const { data: adminRow, error: aErr } = await supabaseAdmin
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (aErr) return { ok: false as const, status: 500, error: aErr.message };
  if (!adminRow) return { ok: false as const, status: 403, error: 'Forbidden' };

  return { ok: true as const };
}

function pin6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashPin(pin: string) {
  const salt = process.env.OWNER_PIN_SALT || 'dev-salt';
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await req.json().catch(() => null)) as null | { code: string };
  const code = (body?.code || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const { data: albumRow, error: albErr } = await supabaseAdmin
    .from('albums')
    .select('id, code')
    .eq('code', code)
    .maybeSingle();

  if (albErr) return NextResponse.json({ error: albErr.message }, { status: 500 });
  if (!albumRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
