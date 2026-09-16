import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — Momentum Labz CRM',
  description: 'Sign in to your Momentum Labz CRM account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      {children}
    </div>
  )
}
