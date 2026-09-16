const fs = require('fs');

// --- Patch TasksPage ---
let pageCode = fs.readFileSync('src/app/(app)/tasks/page.tsx', 'utf8');

// Add users state
pageCode = pageCode.replace(
  `  const [projects, setProjects] = useState<any[]>([]);`,
  `  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);`
);

// Fetch users
pageCode = pageCode.replace(
  `      supabase.from('tasks').select('*, leads(contacts(full_name)), projects(name)').order('sort_order', { ascending: true }),
      supabase.from('leads').select('id, contacts(full_name)'),
      supabase.from('projects').select('id, name')
    ]);`,
  `      supabase.from('tasks').select('*, leads(contacts(full_name)), projects(name), users(full_name)').order('sort_order', { ascending: true }),
      supabase.from('leads').select('id, contacts(full_name)'),
      supabase.from('projects').select('id, name'),
      supabase.from('users').select('id, full_name, email')
    ]);`
);
pageCode = pageCode.replace(
  `      { data: tasksData },
      { data: leadsData },
      { data: projectsData }
    ] = await Promise.all([`,
  `      { data: tasksData },
      { data: leadsData },
      { data: projectsData },
      { data: usersData }
    ] = await Promise.all([`
);
pageCode = pageCode.replace(
  `    if (projectsData) setProjects(projectsData);`,
  `    if (projectsData) setProjects(projectsData);
    if (usersData) setUsers(usersData);`
);

// Pass users to TaskModal
pageCode = pageCode.replace(
  `        leads={leads}
        projects={projects}`,
  `        leads={leads}
        projects={projects}
        users={users}`
);

fs.writeFileSync('src/app/(app)/tasks/page.tsx', pageCode);

// --- Patch TaskModal ---
let modalCode = fs.readFileSync('src/app/(app)/tasks/TaskModal.tsx', 'utf8');

modalCode = modalCode.replace(
  `  projects, 
  onSave 
}: { `,
  `  projects, 
  users,
  onSave 
}: { `
);

modalCode = modalCode.replace(
  `  projects: any[], 
  onSave: () => void 
}) {`,
  `  projects: any[], 
  users: any[],
  onSave: () => void 
}) {`
);

modalCode = modalCode.replace(
  `    project_id: '',
    due_date: new Date().toISOString().split('T')[0],`,
  `    project_id: '',
    assigned_to: '',
    due_date: new Date().toISOString().split('T')[0],`
);

modalCode = modalCode.replace(
  `        project_id: task.project_id || '',
        due_date:`,
  `        project_id: task.project_id || '',
        assigned_to: task.assigned_to || '',
        due_date:`
);

modalCode = modalCode.replace(
  `        project_id: formData.project_id || null,
        due_at:`,
  `        project_id: formData.project_id || null,
        assigned_to: formData.assigned_to || null,
        due_at:`
);

modalCode = modalCode.replace(
  `          <Select label="Priority"`,
  `          <Select label="Assignee" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
            <option value="">Unassigned</option>
            {users?.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </Select>

          <Select label="Priority"`
);

fs.writeFileSync('src/app/(app)/tasks/TaskModal.tsx', modalCode);

// --- Patch TasksKanban ---
let kanbanCode = fs.readFileSync('src/app/(app)/tasks/TasksKanban.tsx', 'utf8');

// Display assignee on the card
kanbanCode = kanbanCode.replace(
  `                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">`,
  `                    {task.users?.full_name && (
                      <div className="flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-50 border border-neutral-100 rounded px-1.5 py-0.5 w-fit">
                        <span className="font-semibold">{task.users.full_name}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">`
);

fs.writeFileSync('src/app/(app)/tasks/TasksKanban.tsx', kanbanCode);
