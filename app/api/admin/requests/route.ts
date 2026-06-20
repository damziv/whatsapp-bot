// app/api/admin/requests/route.ts
// Admin-only: list access requests, and approve (create photographer + email) or reject.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';

function getBearer(req: NextRequest) {
  const authz = req.headers.get('authorization') || '';
  return authz.startsWith('Bearer ') ? authz.slice(7) : null;
}

async function requireAdmin(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' };
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) return { ok: false as const, status: 401, error: 'Unauthorized' };
  const { data: adminRow, error: aErr } = await supabaseAdmin
    .from('admins')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (aErr) return { ok: false as const, status: 500, error: aErr.message };
  if (!adminRow) return { ok: false as const, status: 403, error: 'Forbidden' };
  return { ok: true as const };
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// -------------------- GET (list) --------------------
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { data, error } = await supabaseAdmin
    .from('photographer_requests')
    .select('id, name, email, message, status, quota_yearly, created_at, reviewed_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

// -------------------- PATCH (approve / reject) --------------------
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await req.json().catch(() => null)) as
    | null
    | { id: string; action: 'approve' | 'reject'; quota_yearly?: number };

  const id = (body?.id || '').trim();
  const action = body?.action;
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
  }

  const { data: reqRow, error: rErr } = await supabaseAdmin
    .from('photographer_requests')
    .select('id, name, email, status')
    .eq('id', id)
    .maybeSingle();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  // ----- REJECT -----
  if (action === 'reject') {
    const { error } = await supabaseAdmin
      .from('photographer_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ----- APPROVE -----
  const quota_yearly = Number(body?.quota_yearly ?? 50);
  if (!Number.isFinite(quota_yearly) || quota_yearly <= 0) {
    return NextResponse.json({ error: 'quota_yearly must be a positive number' }, { status: 400 });
  }

  const email = (reqRow.email || '').trim().toLowerCase();

  // Find or create the auth user (magic-link only, no password).
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  let userId: string | null =
    (list?.users ?? []).find((u: any) => (u.email ?? '').toLowerCase() === email)?.id ?? null;

  if (!userId) {
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    userId = created?.user?.id ?? null;
  }
  if (!userId) return NextResponse.json({ error: 'Failed to create/find user' }, { status: 500 });

  // Create/upsert the photographer record with the chosen quota + 1-year period.
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);

  const { error: pErr } = await supabaseAdmin.from('photographers').upsert(
    {
      user_id: userId,
      company_name: reqRow.name || null,
      quota_yearly,
      period_start: isoDate(start),
      period_end: isoDate(end),
      is_active: true,
    },
    { onConflict: 'user_id' }
  );
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Send the magic-link login email (Supabase) — this is their "you can log in now" link.
  const siteUrl = req.nextUrl.origin;
  await supabaseAdmin.auth
    .signInWithOtp({ email, options: { emailRedirectTo: `${siteUrl}/auth/callback` } })
    .catch(() => {});

  // Send a branded "approved" email (best-effort).
  // reply_to keeps replies going to your real inbox even if `from` is another domain.
  await sendEmail({
    to: email,
    replyTo: process.env.MAIL_REPLY_TO || 'info@qrevent.pro',
    subject: 'Your QRevent account is approved 🎉',
    html: `
      <h2>Welcome to QRevent, ${reqRow.name || ''}!</h2>
      <p>Your photographer account has been approved. You can now sign in and create your first event QR code.</p>
      <p><a href="${siteUrl}/login">Sign in to QRevent</a></p>
      <p>We also sent you a one-tap magic-link login in a separate email.</p>
    `,
  }).catch(() => {});

  const { error: uErr } = await supabaseAdmin
    .from('photographer_requests')
    .update({ status: 'approved', quota_yearly, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
