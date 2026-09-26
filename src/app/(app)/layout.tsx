export const dynamic = 'force-dynamic'

import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { ToastProvider } from '@/components/ui/Toast'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Skip auth check entirely in bypass mode
  if (process.env.NEXT_PUBLIC_BYPASS_AUTH !== 'true') {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
