// app/w/route.ts
// QR / share-link target. Looks up the album to pre-fill a friendly, localized
// WhatsApp message that still contains the code (the bot parses it).
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function firstRel<T>(rel: any): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get('code') || '').trim();
  const num = process.env.WHATSAPP_NUMBER_DIGITS!; // e.g. "385991234567"

  // Default fallback message (also used if the album lookup fails).
  let text = `ALBUM ${code}`;

  if (code) {
    try {
      const { data: album } = await supabaseAdmin
        .from('albums')
        .select('code, lang, events:event_id(profiles:profile_id(bride_name, groom_name))')
        .eq('code', code)
        .maybeSingle();

      if (album) {
        // No guest phone number yet at scan time, so we can't auto-detect:
        // use the album's explicit language, else default to English.
        const lang = (album as any).lang === 'hr' || (album as any).lang === 'en' ? (album as any).lang : 'en';

        const ev = firstRel<any>((album as any).events);
        const prof = firstRel<any>(ev?.profiles);
        const bride = (prof?.bride_name || '').trim();
        const groom = (prof?.groom_name || '').trim();
        const names = bride && groom ? `${bride} & ${groom}` : bride || groom || '';

        if (lang === 'hr') {
          text = names
            ? `Bok! 📸 Šaljem svoje fotografije s vjenčanja ${names} (ALBUM ${code})`
            : `Bok! 📸 Šaljem svoje fotografije (ALBUM ${code})`;
        } else {
          text = names
            ? `Hi! 📸 Sharing my photos for ${names}'s wedding (ALBUM ${code})`
            : `Hi! 📸 Sharing my photos (ALBUM ${code})`;
        }
      }
    } catch {
      // keep the simple fallback
    }
  }

  const wa = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  return NextResponse.redirect(wa, { status: 302 });
}
