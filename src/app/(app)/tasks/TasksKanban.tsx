/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { AlignLeft, Clock, CheckSquare } from 'lucide-react';

const COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'];

export function TasksKanban({ tasks, onStatusChange, onCardClick }: { 
  tasks: any[], 
  onStatusChange: (taskId: string, newStatus: string) => void, 
  onCardClick: (t: any) => void 
}) {

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onStatusChange(taskId, newStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-danger-bg text-danger-text';
      case 'medium': return 'bg-warning-bg text-warning-text';
      case 'low': return 'bg-success-bg text-success-text';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
      {COLUMNS.map(column => {
        const columnTasks = tasks.filter(t => t.status === column).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        
        return (
          <div 
            key={column} 
            className="flex-shrink-0 w-[300px] flex flex-col bg-neutral-50 rounded-[12px] border border-neutral-100"
            onDrop={(e) => handleDrop(e, column)}
            onDragOver={handleDragOver}
          >
            <div className="p-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50 rounded-t-[12px]">
              <h3 className="text-sm font-medium text-neutral-900">{column}</h3>
              <span className="text-xs font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                {columnTasks.length}
              </span>
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-2">
              {columnTasks.map(task => {
                const checklist = task.checklist || [];
                const completedItems = checklist.filter((i: any) => i.completed).length;
                const hasChecklist = checklist.length > 0;
                
                return (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onCardClick(task)}
                    className="bg-neutral-0 p-3 rounded-[8px] border border-neutral-100 shadow-sm cursor-grab active:cursor-grabbing hover:border-neutral-200 transition-colors flex flex-col gap-2"
                  >
                    <div className="flex flex-wrap gap-1">
                      {task.priority && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      )}
                      {(task.labels || []).map((label: string, idx: number) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-accent-50 text-accent-700">
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="font-medium text-sm text-neutral-900 leading-tight">
                      {task.title}
                    </div>

                    {task.users?.full_name && (
                      <div className="flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-50 border border-neutral-100 rounded px-1.5 py-0.5 w-fit">
                        <span className="font-semibold">{task.users.full_name}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                      {task.due_at && (
                        <div className={`flex items-center gap-1 ${new Date(task.due_at).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) && task.status !== 'Done' ? 'text-danger-600 bg-danger-50 px-1 rounded' : ''}`} title="Due Date">
                          <Clock size={12} />
                          <span>{new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                      
                      {task.description && (
                        <div className="flex items-center gap-1" title="Has description">
                          <AlignLeft size={12} />
                        </div>
                      )}
                      
                      {hasChecklist && (
                        <div className={`flex items-center gap-1 ${completedItems === checklist.length ? 'text-success-500' : ''}`} title="Checklist">
                          <CheckSquare size={12} />
                          <span>{completedItems}/{checklist.length}</span>
                        </div>
                      )}
                    </div>
                    
                    {(task.projects?.name || task.leads?.contacts?.full_name) && (
                      <div className="text-xs text-neutral-500 mt-1 truncate">
                        {task.projects?.name ? `P: ${task.projects.name}` : `L: ${task.leads.contacts.full_name}`}
                      </div>
                    )}

                    <div className="flex gap-1 mt-1 flex-wrap">
                      {task.is_out_of_scope && <span className="text-[9px] bg-danger-bg text-danger-text px-1 py-0.5 rounded font-semibold border border-danger-200">Out of Scope</span>}
                      {task.is_client_visible && <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1 py-0.5 rounded font-semibold border border-neutral-200">Visible</span>}
                      {task.requires_client_approval && <span className="text-[9px] bg-accent-50 text-accent-700 px-1 py-0.5 rounded font-semibold border border-accent-200">Approval</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
