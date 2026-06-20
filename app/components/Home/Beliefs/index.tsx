'use client'
import React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

const Beliefs = () => {
  const t = useTranslations('Home')
  return (
    <section className='bg-cover bg-center overflow-hidden'>
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
          {/* COLUMN-1 */}

          <div className="bg-purple pt-12 px-10 sm:px-24 pb-52 md:pb-70 rounded-3xl bg-[url('/images/beliefs/swirls.svg')] bg-no-repeat bg-right-bottom">
            <p className='text-lg font-normal text-white tracking-widest mb-5 text-center sm:text-start uppercase'>
              {t('beliefsCol1Eyebrow')}
            </p>
            <h3 className="text-white mb-5 text-center sm:text-start">
            {t('beliefsCol1Title')}{' '}
          </h3>
              <p className="text-lg text-white/75 pt-2 mb-16 text-center sm:text-start">
              {t('beliefsCol1Para')}
              </p>
            <div className='text-center sm:text-start'>
              
            </div>
          </div>

          {/* COLUMN-2 */}
          <div className=''>
            <div className="bg-[#D6FFEB] pt-12 px-10 sm:px-24 pb-52 md:pb-70 rounded-3xl bg-[url('/images/beliefs/bg.svg')] bg-no-repeat bg-bottom">
            <p className="text-lg font-normal text-primary tracking-widest mb-5 text-center sm:text-start uppercase">
              {t('beliefsCol2Eyebrow')}
            </p>

            <h3 className="text-black mb-5 text-center sm:text-start">
              <span className="text-primary">{t('beliefsCol2TitleA')}</span>{t('beliefsCol2TitleB')}
            </h3>

            <p className="pt-2 mb-16 text-center sm:text-start text-black/75 text-lg">
            {t('beliefsCol2Para')}
            </p>

              <div className='text-center sm:text-start'>
               
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
export default Beliefs
