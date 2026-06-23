'use client'
import React from 'react'
import { useTranslations } from 'next-intl'

const Beliefs = () => {
  const t = useTranslations('Home')
  return (
    <section className='overflow-hidden'>
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
          {/* COLUMN-1 */}
          <div className="bg-purple pt-12 px-10 sm:px-14 pb-14 rounded-3xl bg-[url('/images/beliefs/swirls.svg')] bg-no-repeat bg-right-bottom">
            <p className='text-base font-medium text-white/80 tracking-widest mb-4 text-center sm:text-start uppercase'>
              {t('beliefsCol1Eyebrow')}
            </p>
            <h3 className='text-white mb-4 text-center sm:text-start'>
              {t('beliefsCol1Title')}
            </h3>
            <p className='text-lg text-white/75 text-center sm:text-start'>
              {t('beliefsCol1Para')}
            </p>
          </div>

          {/* COLUMN-2 */}
          <div className="bg-[#D6FFEB] pt-12 px-10 sm:px-14 pb-14 rounded-3xl bg-[url('/images/beliefs/bg.svg')] bg-no-repeat bg-bottom">
            <p className='text-base font-medium text-primary tracking-widest mb-4 text-center sm:text-start uppercase'>
              {t('beliefsCol2Eyebrow')}
            </p>
            <h3 className='text-black mb-4 text-center sm:text-start'>
              <span className='text-primary'>{t('beliefsCol2TitleA')}</span>
              {t('beliefsCol2TitleB')}
            </h3>
            <p className='text-lg text-black/75 text-center sm:text-start'>
              {t('beliefsCol2Para')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
export default Beliefs
