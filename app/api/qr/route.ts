// app/api/qr/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get('data') || '';
  if (!data) return new NextResponse('Missing data', { status: 400 });

  // You can tweak width/margin as you like
  const png = await QRCode.toBuffer(data, { width: 220, margin: 1 });

  return new NextResponse(png, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      // cache forever; content is immutable for a given link
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
