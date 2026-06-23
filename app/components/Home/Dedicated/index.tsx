'use client'
import React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

const Dedicated = () => {
  const t = useTranslations('Home')
  return (
    <section className='relative bg-cover bg-center overflow-hidden'>
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-5'>
          <Image
            src='/images/dedicated/spiral.svg'
            height={272}
            width={686}
            alt='spiral-design'
            className='absolute left-0 top-0 hidden lg:block -z-10'
          />
          {/* Left Column */}
          <div className='col-span-12 lg:col-span-6 justify-self-center'>
            <Image
              src='/images/dedicated/man.png'
              alt='man-icon'
              width={416}
              height={530}
              className='mx-auto md:mx-0'
            />
          </div>

          {/* Right Column */}
          <div className='col-span-12 lg:col-span-6'>
            <div className='relative'>
              <Image
                src='/images/dedicated/comma.svg'
                alt='comma-image'
                width={200}
                height={106}
                className='absolute -top-16 -left-32 hidden lg:block'
              />
            </div>
            <h2 className='text-center lg:text-start leading-tight'>
            {t('dedicatedQuote')}
            </h2>
            <p className='text-lg font-medium text-black/55 mt-4 text-center lg:text-start'>
            {t('dedicatedPara')}
            </p>

          </div>
        </div>
      </div>
    </section>
  )
}
export default Dedicated
