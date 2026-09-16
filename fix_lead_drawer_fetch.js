const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/leads/LeadDrawer.tsx', 'utf8');

code = code.replace(
  `const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    
    if (data) setActivities(data);
    setLoading(false);`,
  `const { data: acts } = await supabase
      .from('activities')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
      
    const { data: props } = await supabase
      .from('proposals')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    
    if (acts) setActivities(acts);
    if (props) setProposals(props);
    setLoading(false);`
);

fs.writeFileSync('src/app/(app)/leads/LeadDrawer.tsx', code);
