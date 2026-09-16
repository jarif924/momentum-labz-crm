'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import Link from 'next/link'
import { Layers, Calendar, ExternalLink } from 'lucide-react'

export default function ProjectsPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*, companies(name), leads(contacts(full_name))')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
    } else if (data) {
      setProjects(data)
    }
    setLoading(false)
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'active':
        return 'bg-success-50 text-success-600'
      case 'planning':
        return 'bg-warning-50 text-warning-700'
      case 'completed':
        return 'bg-neutral-100 text-neutral-600'
      case 'blocked':
        return 'bg-error-50 text-error-600'
      case 'review':
        return 'bg-accent-50 text-accent-600'
      case 'retained':
        return 'bg-success-100 text-success-700'
      default:
        return 'bg-neutral-100 text-neutral-600'
    }
  }

  return (
    <div className="flex flex-col h-full max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Delivery & Projects</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage ongoing work and monitor project statuses.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-neutral-500 text-sm animate-pulse">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden p-12 flex flex-col items-center justify-center text-center">
          <Layers size={48} className="text-neutral-200 mb-4" />
          <h3 className="text-base font-semibold text-neutral-900 mb-1">No active projects</h3>
          <p className="text-sm text-neutral-500 max-w-sm">
            Projects are automatically created when a Lead is marked as &quot;Won&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const clientName = project.companies?.name || project.leads?.contacts?.full_name || 'Unknown Client'
            
            return (
              <Link 
                href={`/projects/${project.id}`} 
                key={project.id} 
                className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
              >
                <div className="p-5 border-b border-neutral-100 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getStatusStyle(project.status)}`}>
                      {project.status || 'Unknown'}
                    </span>
                    <ExternalLink size={16} className="text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">{project.name}</h3>
                  <p className="text-sm text-neutral-500 line-clamp-1">{clientName}</p>
                </div>

                <div className="p-4 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-neutral-400" />
                    <span>Started: {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-700">Target:</span>
                    <span>{project.target_date ? new Date(project.target_date).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
