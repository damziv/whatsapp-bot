export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get('data') || '';
  if (!data) return new NextResponse('Missing data', { status: 400 });

  const buf = await QRCode.toBuffer(data, { width: 220, margin: 1 });

  // Convert Node Buffer -> Web-compatible BodyInit
  const bytes = new Uint8Array(buf); // or use: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
