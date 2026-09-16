const fs = require('fs');

let content = fs.readFileSync('src/app/(app)/tasks/page.tsx', 'utf8');

// The Developer view is this part:
// <tbody>
//   {tasks.filter(t => !t.completed).map((task) => (

content = content.replace(
  "<tbody>\n                  {tasks.filter(t => !t.completed).map((task) => (",
  `<tbody>
                  {tasks.filter(t => !t.completed).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <CheckCircle2 size={40} className="text-neutral-200 mb-3" />
                          <p className="text-sm font-medium text-neutral-900">No active tasks</p>
                          <p className="text-sm text-neutral-500 mt-1">You're all caught up! Enjoy your day.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tasks.filter(t => !t.completed).map((task) => (`
);

fs.writeFileSync('src/app/(app)/tasks/page.tsx', content);
console.log('Fixed tasks page empty state');
