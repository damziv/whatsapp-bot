'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type CreatedAlbumResponse = {
  album: {
    code: string;
    bride_name: string;
    groom_name: string;
    event_date: string;
    start_at: string;
    end_at: string;
    is_active: boolean;
    share_link: string;
    gallery_link: string;
    owner_pin?: string; // backend returns this on create
  };
};

export default function PortalCreatePage() {
  const [err, setErr] = useState<string | null>(null);

  // form
  const [bride, setBride] = useState('');
  const [groom, setGroom] = useState('');
  const [date, setDate] = useState(''); // optional YYYY-MM-DD
  const [creating, setCreating] = useState(false);

  // result modal
  const [created, setCreated] = useState<CreatedAlbumResponse['album'] | null>(null);

  const canSubmit = useMemo(() => {
    return bride.trim().length > 0 && groom.trim().length > 0 && !creating;
  }, [bride, groom, creating]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Kopirano!');
    } catch {
      alert('Greška Kopiranja');
    }
  };

  const getTokenOrRedirect = async () => {
    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = '/login';
      return null;
    }
    return token;
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErr(null);
    setCreating(true);
    setCreated(null);

    const token = await getTokenOrRedirect();
    if (!token) return;

    try {
      const res = await fetch('/api/portal/albums', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bride_name: bride.trim(),
          groom_name: groom.trim(),
          event_date: date ? date : undefined,
        }),
      });

      const out = (await res.json()) as CreatedAlbumResponse | { error: string };
      if (!res.ok) throw new Error(('error' in out && out.error) || 'Failed to create album');

      if ('album' in out) {
        setCreated(out.album);
        setBride('');
        setGroom('');
        setDate('');
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Napravi Album</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Jedan klijent = jedan QR kod. Gosti šalju fotografije putem WhatsAppa.
          </p>
        </div>

        {err && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <p className="text-sm" role="alert" aria-live="assertive">
              {err}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5">
          <form onSubmit={onCreate} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Ime mladenke</label>
                <input
                  value={bride}
                  onChange={(e) => setBride(e.target.value)}
                  placeholder="e.g. Ana"
                  required
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Ime mladoženje</label>
                <input
                  value={groom}
                  onChange={(e) => setGroom(e.target.value)}
                  placeholder="e.g. Marko"
                  required
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Datum događaja</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-brand-400 focus:ring-2 dark:border-white/10 dark:bg-white/5"
              />
              <p className="text-xs text-neutral-500">
              Ako postavite datum, razdoblje za učitavanje bit će centrirano oko njega
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={!canSubmit}
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {creating ? 'kreiram…' : 'Kreiraj album i preuzmi QR kod'}
              </button>

              <a
                href="/portal/albums"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:hover:bg-white/10"
              >
                Svi Albumi
              </a>
            </div>
          </form>
        </div>

        <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 text-sm shadow-card dark:border-white/10 dark:bg-white/5">
          <div className="font-semibold">Što slijedi?</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700 dark:text-neutral-300">
            <li>Podijelite QR kod s gostima → WhatsApp se otvara s već unesenim kodom albuma.</li>
            <li>Gosti pošalju fotografije → one se odmah prikazuju u javnoj galeriji.</li>
            <li>Par (vlasnici) pomoću poveznice za upravljanje i PIN-a mogu brisati ili preuzimati fotografije.</li>
          </ul>
        </div>
      </div>

      {/* Post-create modal (Owner PIN) */}
      {created && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-card dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Album kreiran</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Podijelite QR kod s gostima. PIN dajte paru (vlasnicima) za upravljanje galerijom.
                </p>
              </div>

              <button
                onClick={() => setCreated(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="shrink-0">
                <Image
                  src={`/api/qr?data=${encodeURIComponent(created.share_link)}`}
                  alt="QR"
                  width={130}
                  height={130}
                  unoptimized
                  className="rounded-xl ring-1 ring-black/5 dark:ring-white/10"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="text-sm">
                  <div className="text-xs text-neutral-500">QR kod za goste</div>
                  <div className="truncate font-medium">{created.share_link}</div>
                  <button
                    onClick={() => copy(created.share_link)}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Kopiraj
                  </button>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-neutral-500">Javna galerija</div>
                  <div className="truncate font-medium">{created.gallery_link}</div>
                  <button
                    onClick={() => copy(created.gallery_link)}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Kopiraj
                  </button>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-neutral-500">Upravljanje galerijom</div>
                  <div className="truncate font-medium">{`${window.location.origin}/gallery/manage?code=${encodeURIComponent(
                    created.code
                  )}`}</div>
                  <button
                    onClick={() =>
                      copy(
                        `${window.location.origin}/gallery/manage?code=${encodeURIComponent(created.code)}`
                      )
                    }
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Kopiraj
                  </button>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-neutral-500">Kod albuma</div>
                  <div className="font-mono text-sm">{created.code}</div>
                  <button
                    onClick={() => copy(created.code)}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Kopiraj
                  </button>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-neutral-500">PIN Vlasnika</div>
                  <div className="font-mono text-lg font-semibold tracking-widest">
                    {created.owner_pin ?? '—'}
                  </div>
                  <button
                    onClick={() => created.owner_pin && copy(created.owner_pin)}
                    disabled={!created.owner_pin}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Kopiraj
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setCreated(null)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Gotovo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
