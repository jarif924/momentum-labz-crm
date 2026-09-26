const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/leads/LeadFormModal.tsx', 'utf8');

// The else block is currently:
/*
      } else {
        setFormData({
          contact_id: '',
          new_contact_name: '',
          company_id: '',
          new_company_name: '',
          services: [],
          region: 'international',
          preferred_channel: 'email',
          source: 'cold_outreach',
          stage: 'Prospect Found',
          deal_value: '',
          currency: 'USD',
          custom_fields: {},
          service_line: 'web_development'
        });
      }
*/

code = code.replace(
  "service_line: 'web_development'",
  "service_line: 'web_development',\n          tags: [],\n          niche: '',\n          demo_status: '',\n          running_meta_ads: false"
);

// Also let's check the very initial state
/*
  const [formData, setFormData] = useState<any>({
    contact_id: '',
    ...
    niche: '',
    demo_status: '',
    running_meta_ads: false
  });
*/
// Let's add tags: [] to initial state if missing
if (!code.includes('tags: []') && code.includes('const [formData, setFormData] = useState<any>({')) {
    code = code.replace(
        "running_meta_ads: false",
        "running_meta_ads: false,\n    tags: []"
    );
}

fs.writeFileSync('src/app/(app)/leads/LeadFormModal.tsx', code);
console.log('Fixed LeadFormModal.tsx');
