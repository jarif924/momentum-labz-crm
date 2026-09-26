import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
async function run() {
  await client.connect();
  console.log('Connected to DB! Testing Step 3 (Tasks)...');
  
  // 1. Create a Task
  const taskRes = await client.query(`INSERT INTO tasks (title, due_at, completed) VALUES ('Test Follow Up', now(), false) RETURNING id`);
  const taskId = taskRes.rows[0].id;
  console.log('Created task:', taskId);
  
  // 2. Edit Task
  await client.query(`UPDATE tasks SET completed = true WHERE id = $1`, [taskId]);
  console.log('Marked task as completed');
  
  // 3. Delete Task
  await client.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
  console.log('Deleted task!');
  
  await client.end();
  console.log('Step 3 CRUD verified!');
}
run().catch(console.error);
