const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/leads/LeadFormModal.tsx', 'utf8');

// Add tags state
code = code.replace(
  `const [customFieldsSchema, setCustomFieldsSchema] = useState<any[]>([]);`,
  `const [customFieldsSchema, setCustomFieldsSchema] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);`
);

// Add tags to formData
code = code.replace(
  `custom_fields: lead?.custom_fields || {}`,
  `custom_fields: lead?.custom_fields || {},
      tags: lead?.tags || []` // we assume lead object might pass tags, but actually lead_tags is fetched via join. Let's just use `[]` for now and we will fix the lead object later.
);

// Fetch tags in useEffect
code = code.replace(
  `supabase.from('system_settings').select('*').eq('id', 1).single()
      ]);`,
  `supabase.from('system_settings').select('*').eq('id', 1).single(),
        supabase.from('tags').select('*').order('name')
      ]);`
);

code = code.replace(
  `if (settings) {`,
  `if (tagsData) setAvailableTags(tagsData.data || []);
      if (settings) {`
);

// Fetch existing lead tags if editing
code = code.replace(
  `if (lead) {
      setFormData(`,
  `if (lead) {
      // Need to fetch current tags
      supabase.from('lead_tags').select('tag_id').eq('lead_id', lead.id).then(({data}) => {
        setFormData(prev => ({ ...prev, tags: data?.map((t: any) => t.tag_id) || [] }));
      });
      setFormData(`
);

// Handle save to insert tags
code = code.replace(
  `if (lead?.id) {
        await (supabase.from('leads') as any).update(payload).eq('id', lead.id);
      } else {
        await (supabase.from('leads') as any).insert(payload);
      }`,
  `let finalLeadId = lead?.id;
      if (lead?.id) {
        await (supabase.from('leads') as any).update(payload).eq('id', lead.id);
      } else {
        const { data: newLead } = await (supabase.from('leads') as any).insert(payload).select().single();
        finalLeadId = newLead?.id;
      }
      
      if (finalLeadId) {
        // Sync tags
        await (supabase.from('lead_tags') as any).delete().eq('lead_id', finalLeadId);
        if (formData.tags && formData.tags.length > 0) {
          const tagInserts = formData.tags.map((tId: string) => ({ lead_id: finalLeadId, tag_id: tId }));
          await (supabase.from('lead_tags') as any).insert(tagInserts);
        }
      }`
);

// Render tags UI
const tagsUI = `
        {/* Tags Multi-Select */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => {
              const isSelected = formData.tags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setFormData({...formData, tags: formData.tags.filter((t: string) => t !== tag.id)});
                    } else {
                      setFormData({...formData, tags: [...formData.tags, tag.id]});
                    }
                  }}
                  className={\`px-3 py-1.5 text-xs rounded border transition-colors \${isSelected ? 'bg-neutral-900 border-neutral-900 text-neutral-0' : 'bg-neutral-50 border-neutral-200 text-neutral-600'}\`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
`;

code = code.replace(
  `{/* Services Multi-Select */}`,
  tagsUI + `\n\n        {/* Services Multi-Select */}`
);

fs.writeFileSync('src/app/(app)/leads/LeadFormModal.tsx', code);
