const fs = require('fs');
let lines = fs.readFileSync('src/app/(app)/leads/LeadDrawer.tsx', 'utf8').split('\n');

lines[244] = lines[244] + '$' + lines[304]; // lines are 0-indexed, so 244 is line 245
lines.splice(245, 305 - 245); 

fs.writeFileSync('src/app/(app)/leads/LeadDrawer.tsx', lines.join('\n'));
