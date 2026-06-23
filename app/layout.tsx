import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const font = Manrope({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://www.qrevent.pro'),
  title: {
    default: 'QRevent — collect event photos over WhatsApp',
    template: '%s · QRevent',
  },
  description:
    'Collect every guest’s event photos over WhatsApp with one QR code — no apps, no logins. Photos land in a private gallery you can download and share.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={font.className}>{children}</body>
    </html>
  )
}
