const fs = require('fs');
let page = fs.readFileSync('src/app/(app)/page.tsx', 'utf8');
if (!page.includes('eslint-disable-next-line react-hooks/exhaustive-deps')) {
  page = page.replace('  }, []);', '  // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, []);');
}
fs.writeFileSync('src/app/(app)/page.tsx', page);
