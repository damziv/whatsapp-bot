// app/api/requests/route.ts
// Public endpoint: a prospective photographer requests access from /register.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';

const NOTIFY_TO = process.env.REQUESTS_NOTIFY_EMAIL || 'info@qrevent.pro';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | null
    | { name?: string; email?: string; message?: string };

  const name = (body?.name || '').trim();
  const email = (body?.email || '').trim().toLowerCase();
  const message = (body?.message || '').trim().slice(0, 2000);

  if (!name || !email.includes('@')) {
    return NextResponse.json({ error: 'Missing name or valid email' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('photographer_requests').insert({
    name,
    email,
    message: message || null,
    status: 'pending',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the admin (best-effort; never blocks the request).
  await sendEmail({
    to: NOTIFY_TO,
    replyTo: email,
    subject: `New access request — ${name}`,
    html: `
      <h2>New QRevent access request</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${message ? `<p><strong>Message:</strong><br/>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>` : ''}
      <p>Review and approve it in the admin → Requests tab.</p>
    `,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
