const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/page.tsx', 'utf8');

// We will rewrite the fetchDashboard function
const newFetch = `
    async function fetchDashboard() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [
        { data: allLeadsData },
        { count: tasksCount },
        { data: todayTasksData },
        { data: activitiesData }
      ] = await Promise.all([
        supabase.from('leads').select('stage, region, service_line, deal_value, currency'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false),
        supabase.from('tasks').select('*, leads(contacts(full_name))')
          .eq('completed', false)
          .order('due_at', { ascending: true })
          .limit(10), // we will filter overdue vs today in JS for the widget
        supabase.from('activities').select('*, leads(contacts(full_name))')
          .order('created_at', { ascending: false })
          .limit(5)
      ]) as any;

      if (allLeadsData) {
        const totalLeads = allLeadsData.length;
        const wonLeads = allLeadsData.filter((l: any) => l.stage === 'Won');
        const totalWon = wonLeads.reduce((acc: number, l: any) => acc + (Number(l.deal_value) || 0), 0);
        const currency = wonLeads.length > 0 ? (wonLeads[0].currency || 'USD') : 'USD';

        // Pipeline grouping
        const pipelineStages = ['prospect_found', 'contacted', 'meeting_set', 'proposal_sent', 'negotiation', 'Won', 'Lost'];
        const pipeline: Record<string, number> = {};
        pipelineStages.forEach(s => pipeline[s] = 0);
        allLeadsData.forEach((l: any) => {
          if (pipeline[l.stage] !== undefined) pipeline[l.stage]++;
        });

        // BD vs International
        let bd = 0;
        let intl = 0;
        allLeadsData.forEach((l: any) => {
          if (l.region === 'bangladesh') bd++;
          if (l.region === 'international') intl++;
        });

        // Service Line
        const services: Record<string, number> = { 'tech_solutions': 0, 'web_development': 0, 'marketing': 0, 'unassigned': 0 };
        allLeadsData.forEach((l: any) => {
          if (l.service_line && services[l.service_line] !== undefined) services[l.service_line]++;
          else services['unassigned']++;
        });

        setStats({
          totalLeads,
          openTasks: tasksCount || 0,
          wonValue: totalWon,
          currency,
          pipeline,
          bd,
          intl,
          services
        });
      }

      if (todayTasksData) {
        // Find overdue and today tasks
        const now = new Date();
        const upcomingTasks = [];
        todayTasksData.forEach((t: any) => {
          upcomingTasks.push(t);
        });
        setTasksToday(upcomingTasks);
      }
      if (activitiesData) setRecentActivities(activitiesData);
      
      setLoading(false);
    }
`;

// First, I'll do a robust replacement of the whole component.
