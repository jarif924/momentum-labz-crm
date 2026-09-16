const fs = require('fs');
const file = 'src/components/ui/Modal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `  maxWidth?: 'sm' | 'md' | 'lg';`,
  `  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';`
);

code = code.replace(
  `    lg: 'max-w-[640px]'`,
  `    lg: 'max-w-[640px]',
    xl: 'max-w-[800px]',
    '2xl': 'max-w-[1024px]'`
);

fs.writeFileSync(file, code);
