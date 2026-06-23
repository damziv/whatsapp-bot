import LegalDoc from '@/app/components/Legal/LegalDoc'
import { privacy, getDoc } from '@/lib/legal'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const doc = getDoc(privacy, locale)
  return pageMetadata({ locale, path: '/privacy', title: doc.title, description: doc.description })
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <LegalDoc doc={getDoc(privacy, locale)} locale={locale} />
}
