'use client'

export const dynamic = 'force-dynamic'

import { useLocale, useTranslations } from 'next-intl'

const TIERS = [
  { id: 'starter', codes: 5, price: 60, perCode: 12, featured: false },
  { id: 'pro', codes: 15, price: 150, perCode: 10, featured: true },
  { id: 'studio', codes: 40, price: 360, perCode: 9, featured: false },
] as const

export default function PricingPage() {
  const t = useTranslations('Pricing')
  const locale = useLocale()
  const features = t.raw('features') as string[]

  return (
    <main className='min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 pt-32 pb-20 dark:from-neutral-900 dark:to-neutral-950'>
      <div className='mx-auto w-full max-w-5xl'>
        <div className='mb-12 text-center'>
          <h1 className='text-4xl font-bold tracking-[-0.02em] sm:text-5xl'>{t('title')}</h1>
          <p className='mx-auto mt-4 max-w-2xl text-base text-neutral-600 dark:text-neutral-300'>
            {t('subtitle')}
          </p>
        </div>

        <div className='grid gap-5 md:grid-cols-3'>
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl bg-white p-6 shadow-card dark:bg-white/5 ${
                tier.featured
                  ? 'border-2 border-brand-500'
                  : 'border border-black/5 dark:border-white/10'
              }`}
            >
              {tier.featured && (
                <span className='absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white'>
                  {t('mostPopular')}
                </span>
              )}

              <div className='text-lg font-semibold'>{t(`${tier.id}Name`)}</div>

              <div className='mt-3 flex items-baseline gap-1'>
                <span className='text-4xl font-bold tracking-tight'>€{tier.price}</span>
                <span className='text-sm text-neutral-500'>{t('perYear')}</span>
              </div>

              <div className='mt-1 text-sm text-neutral-600 dark:text-neutral-300'>
                {tier.codes} {t('codes')} · €{tier.perCode} {t('perCodeSuffix')}
              </div>

              <p className='mt-4 text-sm text-neutral-600 dark:text-neutral-300'>{t(`${tier.id}Desc`)}</p>

              <a
                href='/register'
                className={`mt-6 inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                  tier.featured
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'border border-black/10 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:hover:bg-white/10'
                }`}
              >
                {t('cta')}
              </a>
            </div>
          ))}
        </div>

        <div className='mt-12 rounded-2xl border border-black/5 bg-white p-6 shadow-card dark:border-white/10 dark:bg-white/5'>
          <div className='text-sm font-semibold'>{t('includesTitle')}</div>
          <ul className='mt-4 grid gap-3 sm:grid-cols-2'>
            {features.map((f, i) => (
              <li key={i} className='flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300'>
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  className='mt-0.5 shrink-0 text-brand-600'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  aria-hidden='true'
                >
                  <path d='M5 13l4 4L19 7' />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className='mt-8 text-center text-sm text-neutral-600 dark:text-neutral-300'>
          {t('note')}{' '}
          <a
            href={`/${locale}#Contact`}
            className='font-semibold text-brand-700 underline underline-offset-4 dark:text-brand-300'
          >
            {t('noteCta')}
          </a>
        </p>
      </div>
    </main>
  )
}
