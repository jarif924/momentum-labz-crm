import '@/app/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Print Document - Momentum Labz',
}

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
