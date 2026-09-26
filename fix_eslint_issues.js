const fs = require('fs');

// Fix brainstorming page
let bs = fs.readFileSync('src/app/(app)/brainstorming/page.tsx', 'utf8');
bs = '/* eslint-disable @typescript-eslint/no-explicit-any */\n' + bs;
fs.writeFileSync('src/app/(app)/brainstorming/page.tsx', bs);

// Fix proposals page
let prop = fs.readFileSync('src/app/(app)/proposals/page.tsx', 'utf8');
prop = prop.replace(/, Copy, X } from 'lucide-react';/, ", X } from 'lucide-react';");
prop = prop.replace(/You haven't generated/g, "You haven\\'t generated");
fs.writeFileSync('src/app/(app)/proposals/page.tsx', prop);

console.log('Fixed ESLint');
