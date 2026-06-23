export const metadata = {
  title: 'Gallery',
  description: 'Your private event photo gallery.',
}

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
