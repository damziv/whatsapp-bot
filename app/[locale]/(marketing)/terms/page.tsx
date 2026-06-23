import LegalDoc from '@/app/components/Legal/LegalDoc'
import { terms, getDoc } from '@/lib/legal'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const doc = getDoc(terms, locale)
  return pageMetadata({ locale, path: '/terms', title: doc.title, description: doc.description })
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <LegalDoc doc={getDoc(terms, locale)} locale={locale} />
}
