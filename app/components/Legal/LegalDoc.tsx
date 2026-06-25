import type { LegalDocument } from '@/lib/legal'

export default function LegalDoc({ doc, locale }: { doc: LegalDocument; locale: string }) {
  const updatedLabel =
    locale === 'hr' ? 'Posljednja izmjena' : locale === 'de' ? 'Zuletzt aktualisiert' : 'Last updated'

  return (
    <main className='min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 pt-32 pb-20 dark:from-neutral-900 dark:to-neutral-950'>
      <article className='mx-auto w-full max-w-3xl'>
        <h1 className='text-3xl font-bold tracking-[-0.02em] sm:text-4xl'>{doc.title}</h1>
        <p className='mt-2 text-sm text-neutral-500'>
          {updatedLabel}: {doc.updated}
        </p>
        <p className='mt-6 text-base leading-relaxed text-neutral-700 dark:text-neutral-300'>{doc.intro}</p>

        {doc.sections.map((s, i) => (
          <section key={i} className='mt-8'>
            <h2 className='text-xl font-semibold tracking-[-0.01em]'>{s.h}</h2>
            {s.p.map((para, j) => (
              <p key={j} className='mt-3 text-base leading-relaxed text-neutral-700 dark:text-neutral-300'>
                {para}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  )
}
