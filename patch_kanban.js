const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/leads/LeadsKanban.tsx', 'utf8');

// I will insert a small visual indicator inside the kanban card.
const insertionPoint = `<div className="font-medium text-sm text-neutral-900 mb-1">`;
const newUI = `
                  <div className="font-medium text-sm text-neutral-900 mb-1 flex items-center justify-between">
                    <span>{lead.contacts?.full_name}</span>
                    {lead.next_action_date && (
                      <span 
                        title={\`\${lead.next_action_type} on \${new Date(lead.next_action_date).toLocaleDateString()}\`}
                        className={\`w-2 h-2 rounded-full shrink-0 \${
                          new Date(lead.next_action_date) < new Date(new Date().setHours(0,0,0,0)) 
                            ? 'bg-danger-500' // Overdue
                            : new Date(lead.next_action_date).toDateString() === new Date().toDateString()
                              ? 'bg-success-500' // Today
                              : 'bg-warning-500' // Future
                        }\`} 
                      />
                    )}
                  </div>
`;
content = content.replace(insertionPoint + '\n                    {lead.contacts?.full_name}\n                  </div>', newUI); // The original has {lead.contacts?.full_name} inside. Let's just use regex.

content = content.replace(/<div className="font-medium text-sm text-neutral-900 mb-1">\s*\{lead.contacts\?\.full_name\}\s*<\/div>/, newUI);

fs.writeFileSync('src/app/(app)/leads/LeadsKanban.tsx', content);
console.log('Patch kanban complete');
