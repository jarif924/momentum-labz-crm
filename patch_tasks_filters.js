const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/tasks/page.tsx', 'utf8');

// Add state
code = code.replace(
  `const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');`,
  `const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');`
);

// Add filtering logic
code = code.replace(
  `const handleDragEnd = async`,
  `const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (!task.due_at) return false;
    
    const due = new Date(task.due_at);
    due.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (filter === 'overdue') return due < today && task.status !== 'Done';
    if (filter === 'today') return due.getTime() === today.getTime();
    if (filter === 'week') {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return due >= today && due <= nextWeek;
    }
    return true;
  });

  const handleDragEnd = async`
);

// Replace tasks={tasks} with tasks={filteredTasks} in Kanban and List components
code = code.replace(
  `tasks={tasks}
        onTaskClick`,
  `tasks={filteredTasks}
        onTaskClick`
);
code = code.replace(
  `<tbody>
              {tasks.map((task: any)`,
  `<tbody>
              {filteredTasks.map((task: any)`
);

// Add filter UI
const filterUI = `
          <div className="flex bg-neutral-100 p-1 rounded-[10px]">
            <button 
              onClick={() => setFilter('all')}
              className={\`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors \${filter === 'all' ? 'bg-neutral-0 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}\`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('today')}
              className={\`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors \${filter === 'today' ? 'bg-neutral-0 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}\`}
            >
              Today
            </button>
            <button 
              onClick={() => setFilter('week')}
              className={\`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors \${filter === 'week' ? 'bg-neutral-0 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}\`}
            >
              This Week
            </button>
            <button 
              onClick={() => setFilter('overdue')}
              className={\`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors \${filter === 'overdue' ? 'bg-danger-50 text-danger-600 shadow-sm' : 'text-danger-400 hover:text-danger-600'}\`}
            >
              Overdue
            </button>
          </div>
`;

code = code.replace(
  `<div className="flex bg-neutral-100 p-1 rounded-[10px]">
            <button 
              onClick={() => setViewMode('kanban')}`,
  filterUI + `
          <div className="flex bg-neutral-100 p-1 rounded-[10px]">
            <button 
              onClick={() => setViewMode('kanban')}`
);

fs.writeFileSync('src/app/(app)/tasks/page.tsx', code);
