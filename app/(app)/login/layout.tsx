export const metadata = {
  title: 'QR Event.PRO',
  description: 'Pro Event Gallery',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
