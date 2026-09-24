'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
 useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Menu, X, LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  Building2,
  Briefcase,
  BarChart2,
  Settings,
  Receipt,
  Layers,
  Wallet,
  ArrowDownLeft
, Lightbulb
} from 'lucide-react'

// ─── Nav configuration — Section 4 of the implementation plan ─────────────
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/leads', label: 'Leads', icon: Users },
      { href: '/tasks', label: 'Tasks & Follow-ups', icon: CheckSquare },
      { href: '/proposals', label: 'Proposals', icon: FileText },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/finances', label: 'Overview', icon: Wallet },
      { href: '/invoices', label: 'Invoices', icon: Receipt },
      { href: '/expenses', label: 'Expenses', icon: ArrowDownLeft },
    ],
  },
  {
    label: 'Clients',
    items: [
      { href: '/contacts', label: 'Contacts & Companies', icon: Building2 },
      { href: '/clients', label: 'Clients', icon: Briefcase },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { href: '/projects', label: 'Projects', icon: Layers },
    ],
  },
  
  {
    label: 'Workspace',
    items: [
      { href: '/brainstorming', label: 'Brainstorming', icon: Lightbulb },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const pathname = usePathname()

  // Determine active route — exact match for '/', prefix match for others
  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
    {/* Section 7.2: 240px wide, neutral-0 bg, 1px neutral-100 right border */}
    

      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-neutral-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-neutral-800 transition-colors"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-neutral-900/50 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-60 min-h-screen bg-neutral-0 border-r border-neutral-100 flex flex-col shrink-0
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button 
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-5 right-4 p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <X size={20} />
        </button>


      {/* Logo block — 32px height, space-6 padding around */}
      <div className="px-6 py-6 border-b border-neutral-100">
        <Link href="/" className="block">
          <Image
            src="/logo.png"
            alt="Momentum Labz"
            width={140}
            height={32}
            style={{ height: '32px', width: 'auto' }}
            priority
          />
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={group.label} className={groupIdx > 0 ? 'mt-6' : ''}>
            {/* Section 7.2: micro uppercase label in neutral-400 */}
            <p className="text-micro text-neutral-400 px-3 mb-2">
              {group.label}
            </p>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 h-10 px-3 rounded-md
                        text-body-medium
                        transition-colors duration-[120ms] ease-out
                        ${active
                          ? 'bg-neutral-900 text-neutral-0'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                        }
                      `}
                    >
                      <Icon
                        size={20}
                        strokeWidth={1.75}
                        className={active ? 'text-neutral-0' : 'text-neutral-400'}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer spacer */}
      <div className="px-3 py-4 border-t border-neutral-100">
        <p className="text-micro text-neutral-400 px-3">
          Momentum Labz CRM v1.0
        </p>
      </div>
    </aside>
    </>
  )
}
