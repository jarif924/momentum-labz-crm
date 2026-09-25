/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { Button, Input, Select } from '@/components/ui/Forms'
import { Trash2, GripVertical } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('pipeline')

  return (
    <div className="flex flex-col h-full max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Workspace Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your CRM pipeline, services, fields, and team.</p>
      </div>

      <div className="flex gap-6 border-b border-neutral-100 mb-6">
        {[
          { id: 'pipeline', label: 'Pipeline Stages' },
          { id: 'services', label: 'Services' },
          { id: 'fields', label: 'Custom Fields' },
          { id: 'team', label: 'Team Members' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pipeline' && <PipelineManager />}
      {activeTab === 'services' && <ServicesManager />}
      {activeTab === 'fields' && <CustomFieldsManager />}
      {activeTab === 'team' && <TeamManager />}
    </div>
  )
}

function PipelineManager() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [stages, setStages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    async function fetchStages() {
      setLoading(true)
      const { data } = await supabase.from('pipeline_stages').select('*').order('sort_order')
      if (data) setStages(data)
      setLoading(false)
    }
    fetchStages()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd() {
    if (!newName.trim()) return
    const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.sort_order)) : 0
    const newStage = { name: newName.trim(), sort_order: maxOrder + 1, is_won: false, is_lost: false }
    
    const { data, error } = await supabase.from('pipeline_stages').insert(newStage).select().single()
    if (data && !error) {
      setStages([...stages, data])
      setNewName('')
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this stage? Leads in this stage might disappear from the board.')) {
      const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
      if (!error) setStages(stages.filter(s => s.id !== id))
    }
  }

  async function toggleStatus(id: string, field: 'is_won' | 'is_lost', value: boolean) {
    const { error } = await supabase.from('pipeline_stages').update({ [field]: value }).eq('id', id)
    if (!error) {
      setStages(stages.map(s => s.id === id ? { ...s, [field]: value } : s))
    }
  }

  if (loading) return <div className="text-sm text-neutral-500 animate-pulse">Loading...</div>

  return (
    <div className="max-w-2xl bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
      <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-500 mb-1">New Stage Name</label>
          <Input placeholder="e.g. Follow Up" value={newName} onChange={e => setNewName(e.target.value)} />
        </div>
        <Button onClick={handleAdd}>Add Stage</Button>
      </div>
      <div className="divide-y divide-neutral-100">
        {stages.map((stage) => (
          <div key={stage.id} className="flex items-center p-4 hover:bg-neutral-50">
            <GripVertical size={16} className="text-neutral-300 mr-3 cursor-grab" />
            <div className="flex-1 font-medium text-sm text-neutral-900">{stage.name}</div>
            
            <div className="flex items-center gap-4 mr-6">
              <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
                <input type="checkbox" checked={stage.is_won} onChange={e => toggleStatus(stage.id, 'is_won', e.target.checked)} />
                Won Stage
              </label>
              <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
                <input type="checkbox" checked={stage.is_lost} onChange={e => toggleStatus(stage.id, 'is_lost', e.target.checked)} />
                Lost Stage
              </label>
            </div>
            
            <Button variant="ghost" size="compact" className="text-danger-text" onClick={() => handleDelete(stage.id)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ServicesManager() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [services, setServices] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [newService, setNewService] = useState('')

  useEffect(() => {
    async function fetchServices() {
      setLoading(true)
      const { data }: any = await supabase.from('system_settings').select('services').eq('id', 1).single()
      if (data?.services) setServices(data.services)
      setLoading(false)
    }
    fetchServices()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd() {
    if (!newService.trim()) return
    const updated = [...services, newService.trim()]
    const { error } = await supabase.from('system_settings' as any).update({ services: updated }).eq('id', 1)
    if (!error) {
      setServices(updated)
      setNewService('')
    }
  }

  async function handleDelete(srv: string) {
    const updated = services.filter(s => s !== srv)
    const { error } = await supabase.from('system_settings' as any).update({ services: updated }).eq('id', 1)
    if (!error) setServices(updated)
  }

  if (loading) return <div className="text-sm text-neutral-500 animate-pulse">Loading...</div>

  return (
    <div className="max-w-2xl bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
      <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-500 mb-1">New Service Name</label>
          <Input placeholder="e.g. SEO Audit" value={newService} onChange={e => setNewService(e.target.value)} />
        </div>
        <Button onClick={handleAdd}>Add Service</Button>
      </div>
      <div className="divide-y divide-neutral-100">
        {services.length === 0 && <div className="p-8 text-center text-neutral-500 text-sm">No services configured.</div>}
        {services.map((srv, idx) => (
          <div key={idx} className="flex justify-between items-center p-4 hover:bg-neutral-50">
            <span className="text-sm font-medium text-neutral-900">{srv}</span>
            <Button variant="ghost" size="compact" className="text-danger-text" onClick={() => handleDelete(srv)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomFieldsManager() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [fields, setFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState('text')

  useEffect(() => {
    async function fetchFields() {
      setLoading(true)
      const { data }: any = await supabase.from('system_settings').select('lead_custom_fields').eq('id', 1).single()
      if (data?.lead_custom_fields) setFields(data.lead_custom_fields as any[])
      setLoading(false)
    }
    fetchFields()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd() {
    if (!newFieldName.trim()) return
    const newField = {
      id: newFieldName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: newFieldName.trim(), type: newFieldType
    }
    if (fields.some(f => f.id === newField.id)) { alert('Exists.'); return }
    const updated = [...fields, newField]
    const { error } = await supabase.from('system_settings' as any).update({ lead_custom_fields: updated }).eq('id', 1)
    if (!error) { setFields(updated); setNewFieldName(''); setNewFieldType('text') }
  }

  async function handleDelete(id: string) {
    if (confirm('Hide this field?')) {
      const updated = fields.filter(f => f.id !== id)
      await supabase.from('system_settings' as any).update({ lead_custom_fields: updated }).eq('id', 1)
      setFields(updated)
    }
  }

  if (loading) return <div className="text-sm text-neutral-500 animate-pulse">Loading...</div>

  return (
    <div className="max-w-2xl bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
      <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Field Name</label>
          <Input placeholder="e.g. Niche" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Type</label>
          <Select value={newFieldType} onChange={e => setNewFieldType(e.target.value)}>
            <option value="text">Text</option>
            <option value="url">Link</option>
          </Select>
        </div>
        <Button onClick={handleAdd}>Add Field</Button>
      </div>
      <div className="flex flex-col">
        {fields.map((f, i) => (
          <div key={i} className="flex justify-between items-center p-4 border-b border-neutral-100 hover:bg-neutral-50">
            <div>
              <span className="text-sm font-medium text-neutral-900 block">{f.name}</span>
              <span className="text-xs text-neutral-500 font-mono mt-0.5 block">{f.id} • {f.type}</span>
            </div>
            <Button variant="ghost" size="compact" className="text-danger-text" onClick={() => handleDelete(f.id)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamManager() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('viewer')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      const { data }: any = await supabase.from('users').select('*').order('full_name')
      if (data) setUsers(data as any)
      setLoading(false)
    }
    fetchUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd() {
    if (!newName.trim() || !newEmail.trim()) {
      setAddError('Enter a name and an email address.')
      return
    }
    setSaving(true)
    setAddError(null)
    const id = crypto.randomUUID()
    const { data, error } = await supabase.from('users').insert({
      id, full_name: newName.trim(), email: newEmail.trim(), role: newRole
    }).select().single()
    setSaving(false)
    if (error || !data) {
      setAddError(`Could not add member: ${error?.message ?? 'no data returned'}`)
      return
    }
    setUsers([...users, data as any])
    setNewName(''); setNewEmail('')
  }

  async function handleDelete(id: string) {
    if (confirm('Remove this team member?')) {
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (!error) setUsers(users.filter(u => u.id !== id))
    }
  }

  if (loading) return <div className="text-sm text-neutral-500 animate-pulse">Loading...</div>

  return (
    <div className="max-w-3xl bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
      <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Full Name</label>
          <Input placeholder="John Doe" value={newName} onChange={e => setNewName(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Email</label>
          <Input placeholder="john@example.com" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Role</label>
          <Select value={newRole} onChange={e => setNewRole(e.target.value)}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add Member'}</Button>
      </div>
      {addError && (
        <div className="px-4 py-2 bg-danger-bg border-b border-neutral-100">
          <p className="text-small text-danger-text">{addError}</p>
        </div>
      )}
      <div className="divide-y divide-neutral-100">
        {users.map(u => (
          <div key={u.id} className="flex justify-between items-center p-4 hover:bg-neutral-50">
            <div>
              <span className="text-sm font-medium text-neutral-900 block">{u.full_name}</span>
              <span className="text-xs text-neutral-500 mt-0.5 block">{u.email}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full uppercase tracking-wider">{u.role}</span>
              <Button variant="ghost" size="compact" className="text-danger-text" onClick={() => handleDelete(u.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
