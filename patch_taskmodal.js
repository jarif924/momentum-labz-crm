const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/tasks/TaskModal.tsx', 'utf8');

// Make props optional
content = content.replace(
  "leads: any[], \n  projects: any[], \n  users: any[],\n  onSave: () => void",
  "leads?: any[], \n  projects?: any[], \n  users?: any[],\n  onSave?: () => void"
);
content = content.replace(
  "leads, \n  projects, \n  users,\n  onSave ",
  "leads = [], \n  projects = [], \n  users = [],\n  onSave "
);

// Add fields to state
content = content.replace(
  "is_client_visible: false,",
  "is_client_visible: false,\n    task_type: 'feature',\n    dri_name: '',\n    loom_url: '',"
);

// Add task type, DRI, and Loom URL to UI
const newFields = `
          <div className="grid grid-cols-2 gap-4">
            <Select label="Task Type" value={formData.task_type} onChange={e => setFormData({...formData, task_type: e.target.value})}>
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="content">Content</option>
            </Select>
            <Input 
              label="DRI (Assignee Name)" 
              value={formData.dri_name} 
              onChange={e => setFormData({...formData, dri_name: e.target.value})} 
            />
          </div>
          
          <Input 
            label="Loom Video URL (Context Brief)" 
            placeholder="https://www.loom.com/share/..."
            value={formData.loom_url} 
            onChange={e => setFormData({...formData, loom_url: e.target.value})} 
          />
`;
content = content.replace(
  "<Input \n            label=\"Title *\" ",
  newFields + "\n          <Input \n            label=\"Title *\" "
);

// Fix onSave
content = content.replace(
  "onSave();",
  "if (onSave) onSave(); else onClose();"
);
content = content.replace(
  "onSave();",
  "if (onSave) onSave(); else onClose();"
);

fs.writeFileSync('src/app/(app)/tasks/TaskModal.tsx', content);
console.log('TaskModal updated with new PM fields');
