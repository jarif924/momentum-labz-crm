import { NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(
  request: Request,
  { params }: { params: { project_id: string; task_id: string } }
) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.project_id) || !uuidRegex.test(params.task_id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  let dbClient: Client | null = null;
  
  try {
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await dbClient.connect();

    // Verify the task belongs to the project and requires approval
    // Clients may only approve tasks they can see in the portal
    const checkRes = await dbClient.query(
      'SELECT id, requires_client_approval FROM tasks WHERE id = $1 AND project_id = $2 AND is_client_visible = true',
      [params.task_id, params.project_id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!checkRes.rows[0].requires_client_approval) {
      return NextResponse.json({ error: 'Task does not require approval' }, { status: 400 });
    }

    // 'Done' must match the Tasks board column name exactly
    await dbClient.query(
      'UPDATE tasks SET completed = true, status = $1 WHERE id = $2',
      ['Done', params.task_id]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Portal approve error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    if (dbClient) {
      await dbClient.end();
    }
  }
}
