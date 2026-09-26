const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/leads/LeadFormModal.tsx', 'utf8');

// 1. Add fields to initial formData
code = code.replace(
  /deal_value: '',\n\s*currency: 'USD'/,
  `deal_value: '',
    currency: 'USD',
    niche: '',
    demo_status: '',
    running_meta_ads: false`
);

// 2. Add fields to setFormData in useEffect when editing
code = code.replace(
  /deal_value: lead.deal_value \|\| '',\n\s*currency: lead.currency \|\| 'USD'/,
  `deal_value: lead.deal_value || '',
        currency: lead.currency || 'USD',
        niche: lead.niche || '',
        demo_status: lead.demo_status || '',
        running_meta_ads: lead.running_meta_ads || false`
);

// 3. Add to the INSERT/UPDATE payload inside handleSave
code = code.replace(
  /deal_value: formData.deal_value \? parseFloat\(formData.deal_value\) : null,\n\s*currency: formData.currency/,
  `deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
      currency: formData.currency,
      niche: formData.niche,
      demo_status: formData.demo_status,
      running_meta_ads: formData.running_meta_ads`
);

// 4. Inject UI fields into the form. We will put them after Deal Value & Currency
const newFieldsUI = `
          {/* Niche & Demo Status */}
          <div className="grid grid-cols-2 gap-4">
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

          <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-neutral-700">
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
  /<\/div>\s*\{\/\* Deal Value & Currency \*\/\}/,
  `</div>\n${newFieldsUI}\n\n          {/* Deal Value & Currency */}`
);

fs.writeFileSync('src/app/(app)/leads/LeadFormModal.tsx', code);
console.log('Patched LeadFormModal.tsx');
