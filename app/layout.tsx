import { Manrope } from 'next/font/google'
import './globals.css'

const font = Manrope({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={font.className}>
      <body className={font.className}>{children}</body>
      </body>
    </html>
  )
}
