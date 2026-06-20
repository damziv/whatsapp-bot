// scripts/seed-demo.ts
//
// Creates (or repairs) the single, always-open DEMO album that powers the
// public /demo page used for cold-email photographer acquisition.
//
// "Always open" works because the WhatsApp webhook treats an album with
// start_at = end_at = null as permanently within its upload window.
//
// Run once:  npx ts-node scripts/seed-demo.ts
// Re-running is safe (idempotent): it just re-asserts always-open + active.

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config(); // fall back to .env for anything not in .env.local

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
if (!url || !serviceRole) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE in env');
}

const supabase = createClient(url, serviceRole);

const CODE = (process.env.DEMO_ALBUM_CODE || 'DEMO').toUpperCase();
const EVENT_SLUG = 'demo';
const ALBUM_SLUG = 'demo';
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function pin6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashPin(pin: string) {
  const salt = process.env.OWNER_PIN_SALT || 'dev-salt';
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

function printLinks() {
  console.log('');
  console.log('Cold-email this ONE link:');
  console.log(`   ${BASE}/demo`);
  console.log('Under the hood (no need to share these):');
  console.log(`   WhatsApp deep link: ${BASE}/w?code=${CODE}`);
  console.log(`   Gallery:            ${BASE}/gallery?code=${CODE}`);
  console.log(`   Manage (PIN):       ${BASE}/gallery/manage?code=${CODE}`);
}

async function main() {
  // 1) Already there? Just re-assert always-open + active.
  const { data: existing, error: exErr } = await supabase
    .from('albums')
    .select('id, code')
    .eq('code', CODE)
    .maybeSingle();
  if (exErr) throw exErr;

  if (existing) {
    const { error: upErr } = await supabase
      .from('albums')
      .update({ start_at: null, end_at: null, is_active: true })
      .eq('id', existing.id);
    if (upErr) throw upErr;
    console.log(`✔ DEMO album "${CODE}" already existed — re-set to always-open + active.`);
    printLinks();
    return;
  }

  // 2) Create the FK chain (album -> event -> profile -> photographer).
  //    Reuse any existing photographer so we never touch auth users.
  const { data: photog, error: pErr } = await supabase
    .from('photographers')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!photog) {
    throw new Error(
      'No photographer row found. Log into the portal once (creates your photographer row), then re-run this script.'
    );
  }

  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .insert({ photographer_id: photog.id, bride_name: 'Demo', groom_name: 'Event', owner_email: null })
    .select('id')
    .single();
  if (profErr) throw profErr;

  const { data: ev, error: evErr } = await supabase
    .from('events')
    .insert({
      profile_id: prof.id,
      type: 'wedding',
      date: new Date().toISOString().slice(0, 10),
      start_at: null, // null window => always open
      end_at: null,
    })
    .select('id')
    .single();
  if (evErr) throw evErr;

  const pin = pin6();
  const { error: alErr } = await supabase.from('albums').insert({
    event_id: ev.id,
    code: CODE,
    event_slug: EVENT_SLUG,
    album_slug: ALBUM_SLUG,
    start_at: null,
    end_at: null,
    is_active: true,
    owner_pin_hash: hashPin(pin),
    owner_pin_set_at: new Date().toISOString(),
  });
  if (alErr) throw alErr;

  console.log(`✔ Created always-open DEMO album "${CODE}".`);
  console.log(`   Owner PIN (manage/wipe via /gallery/manage?code=${CODE}): ${pin}`);
  printLinks();
}

main().catch((e) => {
  console.error('SEED DEMO FAILED:', e?.message || e);
  process.exit(1);
});
