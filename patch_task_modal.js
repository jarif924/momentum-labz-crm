const fs = require('fs');
const file = 'src/app/(app)/tasks/TaskModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add maxWidth to Modal
code = code.replace(
  `<Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'New Task'}>`,
  `<Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'New Task'} maxWidth="xl">`
);

// 2. Remove nested scrollbar
code = code.replace(
  `<div className="flex flex-col md:flex-row gap-6 max-h-[75vh] overflow-y-auto p-1">`,
  `<div className="flex flex-col md:flex-row gap-8">`
);

// 3. Fix label styling to match Input/Select
const oldLabelClass = `block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2`;
const newLabelClass = `block text-xs font-medium text-neutral-600 mb-2`;

code = code.replaceAll(oldLabelClass, newLabelClass);

// capitalize label text to match Input/Select props properly
code = code.replace(`>Description</label>`, `>Description</label>`);
code = code.replace(`>Checklist</label>`, `>Checklist</label>`);
code = code.replace(`>Labels</label>`, `>Labels</label>`);

// 4. Improve checklist styling slightly (e.g., proper flex-1 for input)
code = code.replace(
  `<Input 
                placeholder="Add an item"`,
  `<div className="flex-1">
                <Input 
                  placeholder="Add an item"`
);
// Fix the closing tags for the wrapped Input
code = code.replace(
  `onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
              />
              <Button`,
  `onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                />
              </div>
              <Button`
);

// 5. Improve new label input wrapping similarly
code = code.replace(
  `<Input 
                placeholder="New label"`,
  `<div className="flex-1">
                <Input 
                  placeholder="New label"`
);
code = code.replace(
  `onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())}
              />
              <Button`,
  `onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                />
              </div>
              <Button`
);

// Fix the gap alignment for the add buttons (they should align with the input, so items-start or adjust h-10)
// The Input component wraps the input inside a flex-col with a gap-2. If it has no label, it's just the input.
// But the Button is 10px high. It aligns fine if both have no label.

fs.writeFileSync(file, code);
