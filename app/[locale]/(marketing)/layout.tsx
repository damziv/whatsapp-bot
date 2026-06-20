import Header from '@/app/components/Layout/Header'
import Footer from '@/app/components/Layout/Footer'
import ScrollToTop from '@/app/components/ScrollToTop'
import Aoscompo from '@/utils/aos'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Aoscompo>
        <Header />
        {children}
        <Footer />
      </Aoscompo>
      <ScrollToTop />
    </>
  )
}
