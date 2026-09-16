const fs = require('fs');
let code = fs.readFileSync('src/components/shell/Sidebar.tsx', 'utf8');

if (!code.includes('Receipt')) {
  code = code.replace(
    'Settings,\n} from \'lucide-react\'',
    'Settings,\n  Receipt,\n} from \'lucide-react\''
  );
}

if (!code.includes('{ href: \'/invoices\', label: \'Invoices\'')) {
  code = code.replace(
    `{ href: '/proposals', label: 'Proposals', icon: FileText },`,
    `{ href: '/proposals', label: 'Proposals', icon: FileText },
      { href: '/invoices', label: 'Invoices', icon: Receipt },`
  );
}

fs.writeFileSync('src/components/shell/Sidebar.tsx', code);
