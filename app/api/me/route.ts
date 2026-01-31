export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const authz = req.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = userData.user.id;

  const { data: photographer, error: pErr } = await supabaseAdmin
    .from('photographers')
    .select('id, company_name, quota_yearly, period_start, period_end, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  if (!photographer) {
    return NextResponse.json({ isPhotographer: false, isActive: false });
  }

  return NextResponse.json({
    isPhotographer: true,
    isActive: !!photographer.is_active,
    photographer,
  });
}
