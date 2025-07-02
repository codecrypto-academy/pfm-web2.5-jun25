import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Besu Network Manager',
  description: 'REST API for managing Hyperledger Besu networks',
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
