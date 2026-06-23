import Hero from '@/app/components/Home/Hero'
import Aboutus from '@/app/components/Home/AboutUs'
import Dedicated from '@/app/components/Home/Dedicated'
import Beliefs from '@/app/components/Home/Beliefs'
import FAQ from '@/app/components/Home/FAQ'
import Join from '@/app/components/Home/Joinus'
import { getTranslations } from 'next-intl/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Seo' })
  return pageMetadata({ locale, path: '', title: t('homeTitle'), description: t('homeDescription') })
}

export default function Home() {
  return (
    <main>
      <Hero />
      <Aboutus />
      <Dedicated />
      <Beliefs />
      <FAQ />
      <Join />
    </main>
  )
}
