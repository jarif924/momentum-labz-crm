/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select } from '@/components/ui/Forms';
import { createBrowserClient } from '@supabase/ssr';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';

export function TaskModal({ 
  isOpen, 
  onClose, 
  task, 
  leads = [], 
  projects = [], 
  users = [],
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  task: any, 
  leads?: any[], 
  projects?: any[], 
  users?: any[],
  onSave?: () => void 
}) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'medium',
    lead_id: '',
    project_id: '',
    assigned_to: '',
    due_date: new Date().toISOString().split('T')[0],
    is_client_visible: false,
    task_type: 'feature',
    dri_name: '',
    loom_url: '',
    requires_client_approval: false,
    is_out_of_scope: false,
    labels: [] as string[],
    checklist: [] as any[]
  });
  
  const [newLabel, setNewLabel] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'To Do',
        priority: task.priority || 'medium',
        lead_id: task.lead_id || '',
        project_id: task.project_id || '',
        assigned_to: task.assigned_to || '',
        due_date: task.due_at ? new Date(task.due_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        is_client_visible: task.is_client_visible || false,
        task_type: task.task_type || 'feature',
        dri_name: task.dri_name || '',
        loom_url: task.loom_url || '',
        requires_client_approval: task.requires_client_approval || false,
        is_out_of_scope: task.is_out_of_scope || false,
        labels: task.labels || [],
        checklist: task.checklist || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'To Do',
        priority: 'medium',
        lead_id: '',
        project_id: '',
        assigned_to: '',
        due_date: new Date().toISOString().split('T')[0],
        is_client_visible: false,
        task_type: 'feature',
        dri_name: '',
        loom_url: '',
        requires_client_approval: false,
        is_out_of_scope: false,
        labels: [],
        checklist: []
      });
    }
  }, [task, isOpen]);

  const handleSubmit = async () => {
    if (!formData.title?.trim()) { toast.error('Enter a task title.'); return; }
    if (!formData.due_date || Number.isNaN(new Date(formData.due_date).getTime())) { toast.error('Choose a due date.'); return; }
    if (loading) return;
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        lead_id: formData.lead_id || null,
        project_id: formData.project_id || null,
        assigned_to: formData.assigned_to || null,
        due_at: new Date(formData.due_date).toISOString(),
        is_client_visible: formData.is_client_visible,
        requires_client_approval: formData.requires_client_approval,
        is_out_of_scope: formData.is_out_of_scope,
        labels: formData.labels,
        checklist: formData.checklist,
        task_type: formData.task_type || 'feature',
        dri_name: formData.dri_name?.trim() || null,
        loom_url: formData.loom_url?.trim() || null,
        // sync completed boolean with status for backwards compatibility
        completed: formData.status === 'Done'
      };

      const { error } = task?.id
        ? await (supabase.from('tasks') as any).update(payload).eq('id', task.id)
        : await (supabase.from('tasks') as any).insert(payload);
      if (error) {
        toast.error(`Couldn't save task: ${friendlyError(error)}`);
      } else {
        toast.success(task?.id ? 'Task updated' : 'Task created');
        if (onSave) onSave(); else onClose();
      }
    } catch (e) {
      toast.error(`Couldn't save task: ${friendlyError(e)}`);
    }
    setLoading(false);
  };

  const addLabel = () => {
    if (newLabel.trim() && !formData.labels.includes(newLabel.trim())) {
      setFormData({ ...formData, labels: [...formData.labels, newLabel.trim()] });
      setNewLabel('');
    }
  };

  const removeLabel = (label: string) => {
    setFormData({ ...formData, labels: formData.labels.filter((l: string) => l !== label) });
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormData({ 
        ...formData, 
        checklist: [...formData.checklist, { id: Date.now().toString(), title: newChecklistItem.trim(), completed: false }] 
      });
      setNewChecklistItem('');
    }
  };

  const toggleChecklist = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.map((item: any) => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    });
  };

  const removeChecklistItem = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter((item: any) => item.id !== id)
    });
  };

  const handleDelete = async () => {
    if (task?.id && confirm('Are you sure you want to delete this task?')) {
      setLoading(true);
      const { error } = await (supabase.from('tasks') as any).delete().eq('id', task.id);
      setLoading(false);
      if (error) {
        toast.error(`Couldn't delete task: ${friendlyError(error)}`);
        return;
      }
      toast.success('Task deleted');
      if (onSave) onSave(); else onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'New Task'} maxWidth="xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Main Column */}
        <div className="flex-1 flex flex-col gap-4">
          
          <div className="grid grid-cols-2 gap-4">
            <Select label="Task Type" value={formData.task_type} onChange={e => setFormData({...formData, task_type: e.target.value})}>
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="content">Content</option>
            </Select>
            <Input 
              label="DRI (Assignee Name)" 
              value={formData.dri_name} 
              onChange={e => setFormData({...formData, dri_name: e.target.value})} 
            />
          </div>
          
          <Input 
            label="Loom Video URL (Context Brief)" 
            placeholder="https://www.loom.com/share/..."
            value={formData.loom_url} 
            onChange={e => setFormData({...formData, loom_url: e.target.value})} 
          />

          <Input 
            label="Title *" 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
          />
          
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-2">Description</label>
            <textarea 
              className="w-full min-h-[120px] rounded-[8px] border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 placeholder:text-neutral-400"
              placeholder="Add a more detailed description..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-2">Checklist</label>
            <div className="flex flex-col gap-2 mb-3">
              {formData.checklist.map((item: any) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <input 
                    type="checkbox" 
                    checked={item.completed}
                    onChange={() => toggleChecklist(item.id)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                  <span className={`flex-1 text-sm ${item.completed ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                    {item.title}
                  </span>
                  <button type="button" onClick={() => removeChecklistItem(item.id)} className="text-neutral-300 hover:text-danger-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input 
                  placeholder="Add an item" 
                value={newChecklistItem} 
                onChange={e => setNewChecklistItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                />
              </div>
              <Button variant="secondary" onClick={addChecklistItem}>Add</Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-4">
          <Select label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Done">Done</option>
          </Select>

          <Select label="Assignee" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
            <option value="">Unassigned</option>
            {users?.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </Select>

          <Select label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>

          <Input 
            label="Due Date" 
            type="date" 
            value={formData.due_date} 
            onChange={e => setFormData({...formData, due_date: e.target.value})} 
          />

          <Select label="Project" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
            <option value="">None</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>

          <Select label="Lead" value={formData.lead_id} onChange={e => setFormData({...formData, lead_id: e.target.value})}>
            <option value="">None</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.contacts?.full_name}</option>)}
          </Select>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-2">Labels</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {formData.labels.map((label: string, idx: number) => (
                <span key={idx} className="flex items-center gap-1 bg-accent-50 text-accent-700 text-xs px-2 py-1 rounded">
                  {label}
                  <button type="button" onClick={() => removeLabel(label)} className="hover:text-accent-900 ml-1">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input 
                  placeholder="New label" 
                value={newLabel} 
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                />
              </div>
              <Button variant="secondary" onClick={addLabel}><Plus size={16}/></Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-neutral-100">
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={formData.is_client_visible} onChange={e => setFormData({...formData, is_client_visible: e.target.checked})} className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
              Client Visible
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={formData.requires_client_approval} onChange={e => setFormData({...formData, requires_client_approval: e.target.checked})} className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
              Needs Approval
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={formData.is_out_of_scope} onChange={e => setFormData({...formData, is_out_of_scope: e.target.checked})} className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
              Out of Scope
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-neutral-100">
        {task?.id ? (
          <Button variant="secondary" onClick={handleDelete} className="text-danger-600 hover:bg-danger-50 hover:text-danger-700 border-transparent">
            Delete Task
          </Button>
        ) : <div/>}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.title}>
            {loading ? 'Saving...' : 'Save Task'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
