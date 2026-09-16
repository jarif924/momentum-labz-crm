const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/leads/page.tsx', 'utf8');

const stateHook = `
  const [loading, setLoading] = useState(true);

  // Lost Reason Modal State
  const [lostReasonModalOpen, setLostReasonModalOpen] = useState(false);
  const [lostReasonLeadId, setLostReasonLeadId] = useState('');
  const [lostReason, setLostReason] = useState('');
`;
content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, stateHook);

const handleStageChange = `
  async function handleStageChange(leadId: string, newStage: string) {
    const stageObj = stages.find(s => s.name === newStage);
    
    // Check if it's a lost stage
    if (stageObj && stageObj.is_lost) {
      setLostReasonLeadId(leadId);
      setLostReasonModalOpen(true);
      return;
    }

    await performStageChange(leadId, newStage);
  }

  async function performStageChange(leadId: string, newStage: string, lostReasonText?: string) {
    const previousLeads = [...leads];
    const targetLead = leads.find(l => l.id === leadId);
    
    // Optimistic update
    setLeads(leads.map(l => l.id === leadId ? { ...l, stage: newStage, lost_reason: lostReasonText || l.lost_reason } : l));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { stage: newStage };
    if (lostReasonText) updateData.lost_reason = lostReasonText;

    const { error } = await (supabase.from('leads') as any).update(updateData).eq('id', leadId);
    if (error) {
      alert('Failed to move lead');
      setLeads(previousLeads);
      return;
    }

    const stageObj = stages.find(s => s.name === newStage);
    if (stageObj && stageObj.is_won && targetLead) {
`;

// Replace the start of handleStageChange
content = content.replace(/async function handleStageChange\(leadId: string, newStage: string\) \{[\s\S]*?(?=\/\/ Must have a company)/, handleStageChange + '      // Must have a company');


const modalUI = `
      {/* Lost Reason Modal */}
      {lostReasonModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Mark Lead as Lost</h3>
            <p className="text-sm text-neutral-500 mb-4">Tracking lost reasons helps improve marketing and sales tactics.</p>
            
            <div className="flex flex-col gap-3 mb-6">
              <select 
                className="w-full bg-white border border-neutral-200 rounded-[8px] text-sm p-3"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
              >
                <option value="">Select a reason...</option>
                <option value="Price Too High">Price Too High</option>
                <option value="Went with Competitor">Went with Competitor</option>
                <option value="Ghosted / Unresponsive">Ghosted / Unresponsive</option>
                <option value="Timing / Not Ready">Timing / Not Ready</option>
                <option value="Poor Fit">Poor Fit</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => {
                setLostReasonModalOpen(false);
                setLostReason('');
              }}>Cancel</Button>
              <Button onClick={() => {
                if(!lostReason) return alert('Please select a reason');
                setLostReasonModalOpen(false);
                performStageChange(lostReasonLeadId, stages.find(s => s.is_lost)?.name || 'Lost', lostReason);
                setLostReason('');
              }}>Save & Move</Button>
            </div>
          </div>
        </div>
      )}

      {isDrawerOpen && selectedLead && (
`;
content = content.replace(/\{\/\* Drawer \*\/\}\s*\{isDrawerOpen && selectedLead && \(/, modalUI);

fs.writeFileSync('src/app/(app)/leads/page.tsx', content);
console.log('Patch complete for page.tsx');
