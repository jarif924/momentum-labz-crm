const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/tasks/page.tsx', 'utf8');

content = content.replace(
  "<TasksKanban tasks={tasks} onCardClick={(t) => { setEditTask(t); setIsModalOpen(true); }} />",
  "<TasksKanban tasks={tasks} onStatusChange={async (id, status) => { await supabase.from('tasks').update({ status }).eq('id', id); fetchData(); }} onCardClick={(t) => { setEditTask(t); setIsModalOpen(true); }} />"
);

fs.writeFileSync('src/app/(app)/tasks/page.tsx', content);
console.log('Fixed TasksKanban props');
