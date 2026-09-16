const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const { data: project } = await supabase.from('projects').insert({ name: 'Momentum CRM Redesign', status: 'In Progress' }).select().single();
  
  const { data: task } = await supabase.from('tasks').insert({
    project_id: project.id,
    title: 'Implement Multi-Persona Dashboard',
    task_type: 'feature',
    dri_name: 'Alex Developer',
    description: 'We need the linear-style list view immediately.',
    loom_url: 'https://www.loom.com/share/test',
    status: 'In Progress'
  }).select().single();

  await supabase.from('task_comments').insert([
    {
      task_id: task.id,
      author_name: 'Design Team',
      content: 'I am blocked. I do not have access to the Figma file for the Kanban cards.',
      is_blocker: true
    },
    {
      task_id: task.id,
      author_name: 'Alex Developer',
      content: 'We will use standard Tailwind CSS classes instead of custom hex codes.',
      is_decision: true
    }
  ]);
  
  console.log('Seed complete.');
}
seed();
