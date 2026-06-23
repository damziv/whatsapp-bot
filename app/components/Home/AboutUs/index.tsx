'use client'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

const CARD_IMAGES = [
  '/images/aboutus/imgOne.svg',
  '/images/aboutus/imgTwo.svg',
  '/images/aboutus/imgThree.svg',
]

const Aboutus = () => {
  const t = useTranslations('Home')

  return (
    <section id='About' className=' bg-cover bg-center overflow-hidden'>
      <div className='container mx-auto max-w-7xl px-4 relative z-1'>
        <div className='p-8 sm:p-10 bg-grey rounded-3xl'>
          <Image
            src='/images/aboutus/dots.svg'
            width={100}
            height={100}
            alt='dots-image'
            className='absolute bottom-1 -left-20'
          />
          <p className='text-center text-primary text-base font-medium tracking-widest uppercase'>
            {t('aboutEyebrow')}
          </p>
          <h2 className='text-center pb-8'>{t('aboutTitle')}</h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6'>
            {[1, 2, 3].map((n, i) => (
              <div
                key={n}
                className='hover:bg-darkmode bg-white rounded-2xl p-6 shadow-card group'>
                <h5 className='group-hover:text-white mb-3'>
                  {t(`aboutCard${n}Heading`)}
                </h5>
                <Image
                  src={CARD_IMAGES[i]}
                  alt=''
                  width={72}
                  height={72}
                  className='mb-4'
                />
                <p className='text-base font-normal text-black/70 group-hover:text-white/90'>
                  {t(`aboutCard${n}Para`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Aboutus
