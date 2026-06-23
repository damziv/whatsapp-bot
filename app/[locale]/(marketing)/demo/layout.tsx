import { getTranslations } from 'next-intl/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Seo' })
  return pageMetadata({ locale, path: '/demo', title: t('demoTitle'), description: t('demoDescription') })
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
