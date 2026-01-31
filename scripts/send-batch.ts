import fs from 'fs';
import { parse } from 'csv-parse/sync';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

type GuestRow = {
    name?: string;
    phone_e164: string; // +385...
  };

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error('Usage: ts-node scripts/send-batch.ts guests.csv');
  }

  const rows = parse(fs.readFileSync(csvPath), {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as GuestRow[];

  let sent = 0, failed = 0;

  for (const r of rows) {
    const phoneNumber = "385989054083"; // <-- your WABA number in intl format
    const messageText = "ALBUM 8MVAPGA";
    const waLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(messageText)}`;
  
    const body = 
      `Pozdrav! Danas je Antonelina djevojačka! 🎉🍻
      
      Slikaj i šalji uspomene na WhatsApp:
      ${waLink}
      
      ➡️ Otvori link  
      ➡️ Slikaj i šalji slike  
      
      Sve ide direktno mladencima za uspomenu ❤️`;

    try {
      await client.messages.create({
        messagingServiceSid: process.env.TWILIO_MESSAGING_SID!,
        to: r.phone_e164,
        body
      });
      console.log(`✔ Sent to ${r.phone_e164}`);
      sent++;
      await new Promise(res => setTimeout(res, 200)); // light throttle
    } catch (e: any) {
      console.error(`❌ Failed to ${r.phone_e164}: ${e.message}`);
      failed++;
    }
  }

  console.log({ sent, failed });
}

console.log('SID:', process.env.TWILIO_ACCOUNT_SID);
console.log('TOKEN:', process.env.TWILIO_AUTH_TOKEN?.slice(0, 6));
console.log('MSG SID:', process.env.TWILIO_MESSAGING_SID);

main().catch(err => { console.error(err); process.exit(1); });
