-- Add Trello-like features to tasks

-- Enums
CREATE TYPE task_priority_type AS ENUM ('low', 'medium', 'high');

-- Alter tasks table
ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'To Do';
ALTER TABLE tasks ADD COLUMN sort_order NUMERIC DEFAULT 0;
ALTER TABLE tasks ADD COLUMN description TEXT;
ALTER TABLE tasks ADD COLUMN priority task_priority_type DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN labels TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN checklist JSONB DEFAULT '[]';

-- Migrate existing tasks based on 'completed' boolean
UPDATE tasks SET status = 'Done' WHERE completed = true;
UPDATE tasks SET status = 'To Do' WHERE completed = false OR completed IS NULL;

-- (Optional) We could drop the 'completed' column, but we might want to keep it for backwards compatibility for now, 
-- or we can just drop it to keep the schema clean. Let's keep it to avoid breaking existing queries that might rely on it,
-- though we will update our queries to use 'status'.
