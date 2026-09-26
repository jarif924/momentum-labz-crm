const fs = require('fs');
let code = fs.readFileSync('src/components/shell/Sidebar.tsx', 'utf8');

const newNavGroup = `
  {
    label: 'Workspace',
    items: [
      { href: '/brainstorming', label: 'Brainstorming', icon: Lightbulb },
    ],
  },
  {
    label: 'Reports',`;

code = code.replace(/\{\n    label: 'Reports',/, newNavGroup);
code = code.replace(/from 'lucide-react'/, `, Lightbulb } from 'lucide-react'`);

fs.writeFileSync('src/components/shell/Sidebar.tsx', code);
console.log('Patched Sidebar.tsx with Brainstorming');
