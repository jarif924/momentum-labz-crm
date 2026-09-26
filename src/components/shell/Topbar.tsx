/* eslint-disable @typescript-eslint/no-explicit-any */

'use client'

import { useState, useEffect } from 'react'
import { Search, Bell, ChevronDown, LogOut, User, Settings, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { friendlyError } from '@/lib/errors'

export function Topbar() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  useEffect(() => {
    async function fetchNotifs() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setNotifications(data)
    }
    fetchNotifs()

    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    async function subscribe() {
      // Join with the user's token, or RLS treats the subscriber as anonymous and filters every event out
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || !session) return
      supabase.realtime.setAuth(session.access_token)
      // Unique topic per mount: a shared name lets the previous mount's leave cancel this subscription
      channel = supabase.channel(`notifs-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 10))
        })
        .subscribe()
    }
    subscribe()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])

  const unreadCount = notifications.filter(n => !n.is_read).length

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function markAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (error) { toast.error(`Couldn't update notification: ${friendlyError(error)}`); return }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllAsRead() {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    if (error) { toast.error(`Couldn't update notifications: ${friendlyError(error)}`); return }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return (
    <header className="h-16 bg-neutral-0 border-b border-neutral-100 flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1 max-w-sm relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search leads, contacts…"
          className="w-full h-10 pl-9 pr-3 bg-neutral-50 border border-transparent rounded-md text-body text-neutral-900 placeholder:text-neutral-300 transition-colors focus:outline-none focus:bg-neutral-0 focus:border-neutral-200"
          onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(200,168,75,0.2)' }}
          onBlur={(e) => { e.target.style.boxShadow = 'none' }}
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative h-10 w-10 flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
          >
            <Bell size={20} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-500" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-0 border border-neutral-100 rounded-md z-20 overflow-hidden shadow-lg">
                <div className="p-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                  <span className="text-sm font-semibold text-neutral-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-accent-600 hover:text-accent-700 font-medium">Mark all read</button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-neutral-500">No notifications yet.</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 border-b border-neutral-100 last:border-0 ${!n.is_read ? 'bg-accent-50/30' : 'bg-neutral-0'} hover:bg-neutral-50 transition-colors group relative`}>
                        <div className="flex gap-3">
                          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? 'bg-accent-500' : 'bg-transparent'}`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-neutral-900 mb-0.5">{n.title}</p>
                            <p className="text-xs text-neutral-600 line-clamp-2">{n.message}</p>
                            <div className="flex gap-4 mt-2">
                              {n.link && (
                                <Link href={n.link} onClick={() => { setNotifOpen(false); markAsRead(n.id) }} className="text-[11px] font-semibold text-accent-600 flex items-center gap-1 hover:underline">
                                  View <ArrowRight size={12} />
                                </Link>
                              )}
                              {!n.is_read && (
                                <button onClick={() => markAsRead(n.id)} className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-900">
                                  Dismiss
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-5 bg-neutral-200" />

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 h-10 px-2 rounded-md hover:bg-neutral-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] text-neutral-600 font-bold tracking-wider">FJ</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-medium text-neutral-900 leading-none">Fatin Jarif</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Owner</p>
            </div>
            <ChevronDown size={16} className={`text-neutral-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-0 border border-neutral-100 rounded-md z-20 py-1 shadow-md">
                <button onClick={() => { setProfileOpen(false); router.push('/settings') }} className="w-full h-9 flex items-center gap-2.5 px-3 text-[13px] text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                  <User size={16} className="text-neutral-400" /> Profile
                </button>
                <button onClick={() => { setProfileOpen(false); router.push('/settings') }} className="w-full h-9 flex items-center gap-2.5 px-3 text-[13px] text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                  <Settings size={16} className="text-neutral-400" /> Settings
                </button>
                <div className="my-1 h-px bg-neutral-100" />
                <button onClick={handleSignOut} className="w-full h-9 flex items-center gap-2.5 px-3 text-[13px] text-danger-500 hover:bg-danger-50 transition-colors">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
