const fs = require('fs');

// Fix proposals page again
let prop = fs.readFileSync('src/app/(app)/proposals/page.tsx', 'utf8');
prop = prop.replace(/You haven\\'t generated/g, "You haven&apos;t generated");
fs.writeFileSync('src/app/(app)/proposals/page.tsx', prop);

console.log('Fixed ESLint entity');
