const fs = require('fs');

let sidebar = fs.readFileSync('src/components/shell/Sidebar.tsx', 'utf8');

sidebar = sidebar.replace("import { usePathname }", "import { useState } from 'react'\nimport { usePathname }");
sidebar = sidebar.replace("import {", "import {\n  Menu,\n  X,");
sidebar = sidebar.replace("export function Sidebar() {", "export function Sidebar() {\n  const [mobileOpen, setMobileOpen] = useState(false)\n");

const returnBlock = `
  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-neutral-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-neutral-800 transition-colors"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-neutral-900/50 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={\`
        fixed md:static inset-y-0 left-0 z-50
        w-60 min-h-screen bg-neutral-0 border-r border-neutral-100 flex flex-col shrink-0
        transform transition-transform duration-300 ease-in-out
        \${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      \`}>
        {/* Mobile Close Button */}
        <button 
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-5 right-4 p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <X size={20} />
        </button>
`;

sidebar = sidebar.replace(
  /<aside className="w-60 min-h-screen bg-neutral-0 border-r border-neutral-100 flex flex-col shrink-0">/,
  returnBlock.replace('  return (\n    <>', '')
);

sidebar = sidebar.replace("</aside>\n  )", "</aside>\n    </>\n  )");
sidebar = sidebar.replace("return (", "return (\n    <>");

fs.writeFileSync('src/components/shell/Sidebar.tsx', sidebar);
console.log('Fixed Sidebar');
