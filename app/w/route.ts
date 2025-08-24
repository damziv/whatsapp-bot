// app/w/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || '';
  const num = process.env.WHATSAPP_NUMBER_DIGITS!; // e.g. "385991234567"
  const wa = `https://wa.me/${num}?text=${encodeURIComponent('ALBUM ' + code)}`;
  return NextResponse.redirect(wa, { status: 302 });
}
