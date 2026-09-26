'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/Forms';
import { Plus, List, LayoutGrid, AlertOctagon, CheckCircle2, Circle, MessageSquareWarning } from 'lucide-react';
import { TasksKanban } from './TasksKanban';
import { TaskModal } from './TaskModal';
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';

export default function TasksPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const toast = useToast();

  const [viewMode, setViewMode] = useState<'developer' | 'creative' | 'founder'>('creative');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [tRes, pRes, bRes, lRes, uRes] = await Promise.all([
      supabase.from('tasks').select('*, project:projects(name, status), users(full_name)').order('created_at', { ascending: false }),
      supabase.from('projects').select('*'),
      supabase.from('task_comments').select('*, task:tasks(title, project_id, project:projects(name))').or('is_blocker.eq.true,is_decision.eq.true').order('created_at', { ascending: false }),
      supabase.from('leads').select('id, contacts(full_name)'),
      supabase.from('users').select('id, full_name').order('full_name'),
    ]);
    const loadError = tRes.error || pRes.error || bRes.error || lRes.error || uRes.error;
    if (loadError) toast.error(`Couldn't load tasks: ${friendlyError(loadError)}`);

    if (tRes.data) setTasks(tRes.data);
    if (pRes.data) setProjects(pRes.data);
    if (bRes.data) setBlockers(bRes.data);
    if (lRes.data) setLeads(lRes.data);
    if (uRes.data) setUsers(uRes.data);
  };

  // `completed` and `status` must stay in sync: the list view filters on one, the board on the other
  const setTaskStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('tasks').update({ status, completed: status === 'Done' }).eq('id', id);
    if (error) toast.error(`Couldn't update task: ${friendlyError(error)}`);
    fetchData();
  };

  const toggleTaskStatus = async (task: any) => {
    await setTaskStatus(task.id, task.completed ? 'To Do' : 'Done');
  };

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Internal Operations</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage team sprints, bugs, and deliverables.</p>
        </div>
        <Button onClick={() => { setEditTask(null); setIsModalOpen(true); }} className="shrink-0 gap-2">
          <Plus size={16} /> New Task
        </Button>
      </div>

      {/* Multi-Persona View Toggle */}
      <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg w-fit mb-8">
        <button onClick={() => setViewMode('developer')} className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-all ${viewMode === 'developer' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}>
          <List size={16}/> Developer (Fast List)
        </button>
        <button onClick={() => setViewMode('creative')} className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-all ${viewMode === 'creative' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}>
          <LayoutGrid size={16}/> Creative (Kanban)
        </button>
        <button onClick={() => setViewMode('founder')} className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-all ${viewMode === 'founder' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}>
          <AlertOctagon size={16}/> Founder (Roll-ups)
        </button>
      </div>

      {viewMode === 'creative' && (
        <TasksKanban tasks={tasks} onStatusChange={setTaskStatus} onCardClick={(t) => { setEditTask(t); setIsModalOpen(true); }} />
      )}

      {viewMode === 'developer' && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-600">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-900 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-10">St</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Task ID / Title</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">DRI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {tasks.filter(t => !t.completed).map(task => (
                  <tr key={task.id} className="hover:bg-neutral-50 cursor-pointer transition-colors" onClick={() => { setEditTask(task); setIsModalOpen(true); }}>
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }}>
                      <button className="text-neutral-300 hover:text-accent-500 transition-colors">
                        <Circle size={18} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${task.task_type === 'bug' ? 'bg-danger-50 text-danger-700' : 'bg-neutral-100 text-neutral-600'}`}>{task.task_type || 'task'}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">{task.title}</td>
                    <td className="px-4 py-3 text-neutral-500">{task.project?.name || 'No Project'}</td>
                    <td className="px-4 py-3 font-medium text-neutral-700">{task.dri_name || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'founder' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-danger-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-danger-700 flex items-center gap-2 mb-4">
              <MessageSquareWarning size={20} /> Active Blockers
            </h2>
            <div className="space-y-4">
              {blockers.filter(b => b.is_blocker).length === 0 && <p className="text-sm text-neutral-500 italic">No active blockers.</p>}
              {blockers.filter(b => b.is_blocker).map(b => (
                <div key={b.id} className="bg-danger-50 border border-danger-100 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-semibold text-danger-900">{b.task?.project?.name} - {b.task?.title}</h3>
                    <span className="text-xs font-medium text-danger-600">{b.author_name}</span>
                  </div>
                  <p className="text-sm text-danger-800">{b.content}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-success-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-success-700 flex items-center gap-2 mb-4">
              <CheckCircle2 size={20} /> Recent Key Decisions
            </h2>
            <div className="space-y-4">
              {blockers.filter(b => b.is_decision).length === 0 && <p className="text-sm text-neutral-500 italic">No recent decisions.</p>}
              {blockers.filter(b => b.is_decision).map(b => (
                <div key={b.id} className="bg-success-50 border border-success-100 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-semibold text-success-900">{b.task?.project?.name} - {b.task?.title}</h3>
                    <span className="text-xs font-medium text-success-600">{b.author_name}</span>
                  </div>
                  <p className="text-sm text-success-800">{b.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <TaskModal 
          isOpen={true}
          task={editTask}
          projects={projects}
          leads={leads}
          users={users}
          onClose={() => { setIsModalOpen(false); fetchData(); }} 
        />
      )}
    </div>
  );
}
