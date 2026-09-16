const fs = require('fs');
let sidebar = fs.readFileSync('src/components/shell/Sidebar.tsx', 'utf8');

sidebar = sidebar.replace("import {\n  Menu,\n  X,", "import {\n");
sidebar = sidebar.replace("import { useState } from 'react'", "import { useState } from 'react'\nimport { Menu, X } from 'lucide-react'");

fs.writeFileSync('src/components/shell/Sidebar.tsx', sidebar);
console.log('Fixed imports');
