/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { ChevronLeft, Link as LinkIcon, Eye, CheckCircle2, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    fetchProjectData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProjectData() {
    setLoading(true)
    const [projectRes, tasksRes] = await Promise.all([
      (supabase.from('projects') as any).select('*, companies(name), leads(contacts(full_name))').eq('id', params.id).single(),
      supabase.from('tasks').select('*').eq('project_id', params.id).order('sort_order', { ascending: true })
    ])
    if (projectRes.data) setProject(projectRes.data)
    if (tasksRes.data) setTasks(tasksRes.data)
    setLoading(false)
  }

  async function toggleTask(taskId: string, field: 'is_client_visible' | 'requires_client_approval', currentValue: boolean) {
    const newValue = !currentValue
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: newValue } : t))
    const { error } = await supabase.from('tasks').update({ [field]: newValue } as any).eq('id', taskId)
    if (error) {
      alert('Failed to update task')
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: currentValue } : t))
    }
  }

  function copyPortalLink() {
    const url = `${window.location.origin}/portal/${params.id}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  if (loading) return <div className="p-8 text-center text-neutral-500 animate-pulse">Loading project...</div>
  if (!project) return <div className="p-8 text-center text-error-600">Project not found.</div>

  const clientName = project.companies?.name || project.leads?.contacts?.full_name || 'Unknown Client'

  return (
    <div className="flex flex-col h-full max-w-4xl">
      <Link href="/projects" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 w-fit mb-6">
        <ChevronLeft size={16} />
        Back to Delivery
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-neutral-900">{project.name}</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
              {project.status}
            </span>
          </div>
          <p className="text-sm text-neutral-500">For: <span className="font-medium text-neutral-900">{clientName}</span></p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={copyPortalLink}
            className={`flex items-center gap-2 h-10 px-4 rounded-md font-medium text-sm transition-colors ${copiedLink ? 'bg-success-50 text-success-700' : 'bg-accent-50 text-accent-700 hover:bg-accent-100'}`}
          >
            <LinkIcon size={16} />
            {copiedLink ? 'Copied!' : 'Copy Portal Link'}
          </button>
          <a
            href={`/portal/${project.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 h-10 px-4 rounded-md border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-medium text-sm transition-colors"
          >
            View Portal
            <ArrowUpRight size={16} className="text-neutral-400" />
          </a>
        </div>
      </div>

      <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Project Milestones</h2>
          <p className="text-sm text-neutral-500">Configure what the client sees in their portal</p>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No tasks for this project yet. Go to Tasks to create some.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {tasks.map(task => (
              <div key={task.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${task.completed ? 'border-success-500 bg-success-500' : 'border-neutral-300'}`}>
                    {task.completed && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <div>
                    <h4 className={`text-sm font-medium ${task.completed ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                      {task.title}
                    </h4>
                    {task.description && <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{task.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!task.is_client_visible}
                        onChange={() => toggleTask(task.id, 'is_client_visible', !!task.is_client_visible)}
                      />
                      <div className="w-8 h-4 bg-neutral-200 rounded-full peer peer-checked:bg-accent-500 transition-colors"></div>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${task.is_client_visible ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-xs font-medium text-neutral-600 flex items-center gap-1"><Eye size={13}/> Visible</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!task.requires_client_approval}
                        disabled={!task.is_client_visible}
                        onChange={() => toggleTask(task.id, 'requires_client_approval', !!task.requires_client_approval)}
                      />
                      <div className={`w-8 h-4 rounded-full transition-colors ${!task.is_client_visible ? 'bg-neutral-100 opacity-40' : task.requires_client_approval ? 'bg-success-500' : 'bg-neutral-200'}`}></div>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${task.requires_client_approval ? 'translate-x-4' : ''} ${!task.is_client_visible ? 'opacity-40' : ''}`}></div>
                    </div>
                    <span className={`text-xs font-medium flex items-center gap-1 ${!task.is_client_visible ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      <CheckCircle2 size={13}/> Approval
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
