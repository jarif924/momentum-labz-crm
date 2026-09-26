const fs = require('fs');
let code = fs.readFileSync('src/components/shell/Sidebar.tsx', 'utf8');
code = code.replace(/} , Lightbulb } from 'lucide-react'/, ", Lightbulb\n} from 'lucide-react'");
fs.writeFileSync('src/components/shell/Sidebar.tsx', code);
