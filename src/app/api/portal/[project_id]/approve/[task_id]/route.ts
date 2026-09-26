import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'edge';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: { project_id: string; task_id: string } }
) {
  try {
    const { project_id, task_id } = params;
    
    // Strict UUID validation to prevent SQL injection or path traversal
    if (!UUID_REGEX.test(project_id) || !UUID_REGEX.test(task_id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify task belongs to project and needs approval
    const { data: task, error: fetchError } = await admin
      .from('tasks')
      .select('id, needs_client_approval, status')
      .eq('id', task_id)
      .eq('project_id', project_id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    if (!task.needs_client_approval) {
      return NextResponse.json({ success: false, error: 'Task does not require approval' }, { status: 400 });
    }

    // Update the task to remove the approval flag and move to next logical stage if needed
    const { error: updateError } = await admin
      .from('tasks')
      .update({ needs_client_approval: false })
      .eq('id', task_id);

    if (updateError) {
      throw updateError;
    }

    // Add a system comment recording the approval
    await admin.from('task_comments').insert({
      task_id: task_id,
      content: '✅ Client has approved this task via the portal.',
      created_by: null // system comment
    });

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    console.error('Task approval error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
