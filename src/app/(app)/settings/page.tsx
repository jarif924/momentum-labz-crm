'use client'

import { Suspense, type ComponentType } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Briefcase, Building2, CircleUser, Coins, Columns3, Megaphone, Receipt, SlidersHorizontal, Tag, Users, type LucideIcon,
} from 'lucide-react'
import { TeamManager } from './_components/legacy'
import { CustomFieldsSection } from './_components/CustomFieldsSection'
import { LeadSourcesSection, ServicesSection, TagsSection } from './_components/ListSections'
import { PipelineSection } from './_components/PipelineSection'

type SectionId =
  | 'company' | 'team' | 'account'
  | 'pipeline' | 'sources' | 'services' | 'fields' | 'tags'
  | 'currency' | 'invoicing'

const GROUPS: { label: string; items: { id: SectionId; label: string; icon: LucideIcon }[] }[] = [
  {
    label: 'Workspace',
    items: [
      { id: 'company', label: 'Company profile', icon: Building2 },
      { id: 'team', label: 'Team', icon: Users },
      { id: 'account', label: 'My account', icon: CircleUser },
    ],
  },
  {
    label: 'Sales',
    items: [
      { id: 'pipeline', label: 'Pipeline', icon: Columns3 },
      { id: 'sources', label: 'Lead sources', icon: Megaphone },
      { id: 'services', label: 'Services', icon: Briefcase },
      { id: 'fields', label: 'Custom fields', icon: SlidersHorizontal },
      { id: 'tags', label: 'Tags', icon: Tag },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'currency', label: 'Currency & FX', icon: Coins },
      { id: 'invoicing', label: 'Invoicing', icon: Receipt },
    ],
  },
]

// Sections are added here as they are built; the menu only shows these.
const SECTIONS: Partial<Record<SectionId, ComponentType>> = {
  team: TeamManager,
  pipeline: PipelineSection,
  sources: LeadSourcesSection,
  services: ServicesSection,
  tags: TagsSection,
  fields: CustomFieldsSection,
}

const DEFAULT_SECTION: SectionId = 'pipeline'

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsHub />
    </Suspense>
  )
}

function SettingsHub() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const requested = params.get('tab')
  const active: SectionId = requested && requested in SECTIONS ? (requested as SectionId) : DEFAULT_SECTION
  const Section = SECTIONS[active] ?? PipelineSection
  const groups = GROUPS
    .map(g => ({ ...g, items: g.items.filter(item => item.id in SECTIONS) }))
    .filter(g => g.items.length > 0)

  function open(id: SectionId) {
    router.replace(`${pathname}?tab=${id}`, { scroll: false })
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-h1 text-neutral-900">Settings</h1>
        <p className="mt-1 text-small text-neutral-500">Configure your workspace, sales pipeline and finances.</p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <nav aria-label="Settings sections" className="md:w-56 md:shrink-0">
          <div className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-2 md:mx-0 md:flex-col md:gap-6 md:overflow-visible md:px-0 md:pb-0">
            {groups.map(group => (
              <div key={group.label} className="flex shrink-0 gap-1 md:flex-col">
                <p className="hidden px-3 pb-1 text-micro text-neutral-400 md:block">{group.label}</p>
                {group.items.map(item => {
                  const isActive = item.id === active
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => open(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex h-10 shrink-0 items-center gap-3 whitespace-nowrap rounded-md border px-3 text-body-medium transition-colors duration-120 ${
                        isActive
                          ? 'border-neutral-100 bg-neutral-0 text-neutral-900'
                          : 'border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.75} className={isActive ? 'text-neutral-900' : 'text-neutral-400'} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 max-w-3xl flex-1">
          <Section />
        </div>
      </div>
    </div>
  )
}
