const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/leads/LeadFormModal.tsx', 'utf8');

code = code.replace(
  `{ data: setData }
    ] = await Promise.all([
      supabase.from('contacts').select('*').order('full_name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('pipeline_stages').select('*').order('sort_order'),
      supabase.from('system_settings').select('services, lead_custom_fields').eq('id', 1).single()
    ]) as any;

    if (cData) setContacts(cData);
    if (compData) setCompanies(compData);
    if (stData) setStages(stData);
    if (setData) {
      setAvailableServices(setData.services || []);
      setCustomFieldsSchema(setData.lead_custom_fields || []);
    }`,
  `{ data: setData },
      { data: tagsData }
    ] = await Promise.all([
      supabase.from('contacts').select('*').order('full_name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('pipeline_stages').select('*').order('sort_order'),
      supabase.from('system_settings').select('services, lead_custom_fields').eq('id', 1).single(),
      supabase.from('tags').select('*').order('name')
    ]) as any;

    if (cData) setContacts(cData);
    if (compData) setCompanies(compData);
    if (stData) setStages(stData);
    if (tagsData) setAvailableTags(tagsData);
    if (setData) {
      setAvailableServices(setData.services || []);
      setCustomFieldsSchema(setData.lead_custom_fields || []);
    }`
);

fs.writeFileSync('src/app/(app)/leads/LeadFormModal.tsx', code);
