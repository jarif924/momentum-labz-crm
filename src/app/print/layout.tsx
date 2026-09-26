import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Print Document - Momentum Labz',
}

// Nested under the root layout, which already renders <html>/<body> and global CSS
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-neutral-0 text-neutral-900">{children}</div>
}
