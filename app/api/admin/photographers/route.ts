// app/(app)/api/admin/photographers/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
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

  return { ok: true as const, userId };
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

// -------------------- GET --------------------
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { data: photographers, error } = await supabaseAdmin
    .from('photographers')
    .select('id, user_id, company_name, quota_yearly, period_start, period_end, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pull emails from auth.users
  const userIds = Array.from(new Set((photographers ?? []).map((p: any) => p.user_id).filter(Boolean)));

  let emailById: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users, error: uErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // listUsers returns all users; map only needed ones
    for (const u of (users?.users ?? []) as any[]) {
      if (userIds.includes(u.id)) emailById[u.id] = u.email ?? '';
    }
  }

  return NextResponse.json({
    photographers: (photographers ?? []).map((p: any) => ({
      ...p,
      email: emailById[p.user_id] || null,
    })),
  });
}

// -------------------- POST (Invite + Create) --------------------
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await req.json().catch(() => null)) as
    | null
    | { email: string; company_name?: string | null; quota_yearly?: number };

  const email = (body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

  const company_name = (body?.company_name ?? null) ? String(body?.company_name).trim() : null;

  const quota_yearly = Number(body?.quota_yearly ?? 50);
  if (!Number.isFinite(quota_yearly) || quota_yearly <= 0) {
    return NextResponse.json({ error: 'quota_yearly must be a positive number' }, { status: 400 });
  }

  // Ensure auth user exists; if not, create user (no password, magic link only)
  // If exists, we reuse it.
  let userId: string | null = null;

  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const existing = (list?.users ?? []).find((u: any) => (u.email ?? '').toLowerCase() === email);
  if (existing?.id) {
    userId = existing.id;
  } else {
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    userId = created?.user?.id ?? null;
  }

  if (!userId) return NextResponse.json({ error: 'Failed to create/find user' }, { status: 500 });

  // Create photographers row (idempotent by unique index on user_id)
  const start = new Date();
  const end = addYears(start, 1);

  const { error: pErr } = await supabaseAdmin.from('photographers').upsert(
    {
      user_id: userId,
      company_name,
      quota_yearly,
      period_start: isoDate(start),
      period_end: isoDate(end),
      is_active: true,
    },
    { onConflict: 'user_id' }
  );

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Send magic link invite (OTP)
  // IMPORTANT: this uses the Supabase project email templates & settings
  const siteUrl = req.nextUrl.origin;
  const { error: otpErr } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });

  if (otpErr) return NextResponse.json({ error: otpErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// -------------------- PATCH (Update) --------------------
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await req.json().catch(() => null)) as
    | null
    | {
        id: string;
        is_active?: boolean;
        quota_yearly?: number;
        period_start?: string; // YYYY-MM-DD
        period_end?: string; // YYYY-MM-DD
        company_name?: string | null;
      };

  const id = (body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const patch: any = {};

  if (typeof body?.is_active === 'boolean') patch.is_active = body.is_active;

  if (body?.company_name !== undefined) {
    patch.company_name = body.company_name ? String(body.company_name).trim() : null;
  }

  if (body?.quota_yearly !== undefined) {
    const q = Number(body.quota_yearly);
    if (!Number.isFinite(q) || q <= 0) return NextResponse.json({ error: 'Invalid quota_yearly' }, { status: 400 });
    patch.quota_yearly = q;
  }

  if (body?.period_start !== undefined) {
    const s = String(body.period_start);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return NextResponse.json({ error: 'Invalid period_start' }, { status: 400 });
    patch.period_start = s;
  }

  if (body?.period_end !== undefined) {
    const e = String(body.period_end);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e)) return NextResponse.json({ error: 'Invalid period_end' }, { status: 400 });
    patch.period_end = e;
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  const { error } = await supabaseAdmin.from('photographers').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
