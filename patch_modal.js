const fs = require('fs');
const file = 'src/app/(app)/leads/LeadFormModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add customFieldsSchema and formData.custom_fields
code = code.replace(
  `  const [availableServices, setAvailableServices] = useState<string[]>([]);`,
  `  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [customFieldsSchema, setCustomFieldsSchema] = useState<any[]>([]);`
);

code = code.replace(
  `          currency: lead.currency || 'USD'`,
  `          currency: lead.currency || 'USD',
          custom_fields: lead.custom_fields || {}`
);
code = code.replace(
  `          currency: 'USD'`,
  `          currency: 'USD',
          custom_fields: {}`
);

// 2. Fetch custom fields schema from system_settings
code = code.replace(
  `      supabase.from('system_settings').select('services').eq('id', 1).single()`,
  `      supabase.from('system_settings').select('services, lead_custom_fields').eq('id', 1).single()`
);

code = code.replace(
  `    if (setData?.services) setAvailableServices(setData.services);`,
  `    if (setData?.services) setAvailableServices(setData.services);
    if (setData?.lead_custom_fields) setCustomFieldsSchema(setData.lead_custom_fields);`
);

// 3. Save custom_fields to payload
code = code.replace(
  `        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
        currency: formData.currency
      };`,
  `        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
        currency: formData.currency,
        custom_fields: formData.custom_fields
      };`
);

// 4. Render custom fields UI right before Services
code = code.replace(
  `        {/* Services Multi-Select */}`,
  `        {/* Custom Fields */}
        {customFieldsSchema.length > 0 && (
          <div className="pt-2">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Custom Fields</label>
            <div className="flex flex-col gap-3">
              {customFieldsSchema.map(field => (
                <div key={field.id}>
                  {field.type === 'url' ? (
                    <Input 
                      label={field.name}
                      placeholder="https://..."
                      value={formData.custom_fields[field.id] || ''}
                      onChange={e => setFormData({
                        ...formData, 
                        custom_fields: { ...formData.custom_fields, [field.id]: e.target.value }
                      })}
                    />
                  ) : (
                    <Input 
                      label={field.name}
                      value={formData.custom_fields[field.id] || ''}
                      onChange={e => setFormData({
                        ...formData, 
                        custom_fields: { ...formData.custom_fields, [field.id]: e.target.value }
                      })}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services Multi-Select */}`
);

fs.writeFileSync(file, code);
