const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/leads/LeadFormModal.tsx', 'utf8');

const newFieldsUI = `
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Niche / Industry" 
            value={formData.niche}
            onChange={(e) => setFormData({...formData, niche: e.target.value})}
            placeholder="e.g. Clinics"
          />
          <Input 
            label="Demo Status" 
            value={formData.demo_status}
            onChange={(e) => setFormData({...formData, demo_status: e.target.value})}
            placeholder="e.g. Ready"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer mt-1 mb-2 text-sm text-neutral-700">
          <input 
            type="checkbox" 
            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            checked={formData.running_meta_ads}
            onChange={(e) => setFormData({...formData, running_meta_ads: e.target.checked})}
          />
          Currently running Meta Ads?
        </label>
`;

code = code.replace(
  /<Input label="Deal Value"/,
  `${newFieldsUI}\n          <Input label="Deal Value"`
);

fs.writeFileSync('src/app/(app)/leads/LeadFormModal.tsx', code);
console.log('Patched UI');
