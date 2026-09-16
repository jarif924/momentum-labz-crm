const fs = require('fs');

let content = fs.readFileSync('src/app/(app)/leads/LeadDrawer.tsx', 'utf8');

// 1. Add Calendar, Clock, CheckCircle to lucide imports
content = content.replace(
  "import { X, Mail, Phone, ExternalLink, FileText, Printer } from 'lucide-react';",
  "import { X, Mail, Phone, ExternalLink, FileText, Printer, Calendar, Clock, CheckCircle } from 'lucide-react';"
);

// 2. Add state for next action
const stateHook = `
  const [loading, setLoading] = useState(false);

  // Next Action State
  const [nextActionType, setNextActionType] = useState(lead?.next_action_type || 'call');
  const [nextActionDate, setNextActionDate] = useState(lead?.next_action_date ? lead.next_action_date.split('T')[0] : '');
  const [nextActionNotes, setNextActionNotes] = useState(lead?.next_action_notes || '');
  const [isEditingAction, setIsEditingAction] = useState(false);
`;
content = content.replace(/const \[loading, setLoading\] = useState\(false\);/, stateHook);

// 3. Add handleSaveNextAction function inside component
const funcHook = `
  async function fetchActivities() {
`;
const saveFunc = `
  async function handleSaveNextAction() {
    setLoading(true);
    const { error } = await supabase
      .from('leads')
      .update({
        next_action_type: nextActionType,
        next_action_date: nextActionDate || null,
        next_action_notes: nextActionNotes
      })
      .eq('id', lead.id);
    setLoading(false);
    if (!error) setIsEditingAction(false);
  }

  async function handleCompleteAction() {
    setLoading(true);
    // log to activity timeline automatically
    await (supabase.from('activities') as any).insert({
      lead_id: lead.id,
      channel: nextActionType,
      summary: \`Completed Action: \${nextActionNotes}\`,
      direction: 'outbound'
    });
    
    // clear next action
    await supabase.from('leads').update({
      next_action_type: null,
      next_action_date: null,
      next_action_notes: null
    }).eq('id', lead.id);
    
    setNextActionType('call');
    setNextActionDate('');
    setNextActionNotes('');
    setIsEditingAction(false);
    setLoading(false);
    fetchActivities();
  }

  async function fetchActivities() {
`;
content = content.replace(funcHook, saveFunc);

// 4. Inject Next Action UI block just before Quick Info
const quickInfoRegex = /({\/\* Quick Info \*\/})/;
const nextActionUI = `
          {/* Next Action Box (Pipedrive Style) */}
          <div className="bg-warning-50 border border-warning-200 p-4 rounded-[8px] -mt-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-warning-900 flex items-center gap-1.5"><Calendar size={16} /> Next Action</h3>
              {!isEditingAction && (
                <Button variant="ghost" size="compact" onClick={() => setIsEditingAction(true)}>Edit</Button>
              )}
            </div>
            
            {isEditingAction ? (
              <div className="flex flex-col gap-3 mt-3">
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-white border border-neutral-200 rounded-md text-sm p-2"
                    value={nextActionType}
                    onChange={(e) => setNextActionType(e.target.value)}
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="demo">Demo</option>
                    <option value="follow_up">Follow Up</option>
                  </select>
                  <input 
                    type="date" 
                    className="flex-1 bg-white border border-neutral-200 rounded-md text-sm p-2"
                    value={nextActionDate}
                    onChange={(e) => setNextActionDate(e.target.value)}
                  />
                </div>
                <Input 
                  placeholder="Notes about this action..." 
                  value={nextActionNotes} 
                  onChange={(e) => setNextActionNotes(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="compact" onClick={handleSaveNextAction} disabled={loading}>Save Action</Button>
                  <Button variant="ghost" size="compact" onClick={() => setIsEditingAction(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                {lead.next_action_date ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-warning-900">
                      <span className="capitalize font-semibold">{lead.next_action_type || 'Follow up'}</span>
                      <span className="text-warning-700">on {new Date(lead.next_action_date).toLocaleDateString()}</span>
                    </div>
                    {lead.next_action_notes && <p className="text-sm text-warning-800">{lead.next_action_notes}</p>}
                    <div className="mt-2">
                      <Button size="compact" variant="outline" onClick={handleCompleteAction} disabled={loading} className="bg-white hover:bg-success-50 hover:text-success-700 hover:border-success-200 transition-colors">
                        <CheckCircle size={14} className="mr-1" /> Mark as Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-warning-700 flex flex-col items-start gap-2">
                    <p>No follow-up action scheduled. High-ticket leads go cold without follow-ups!</p>
                    <Button size="compact" onClick={() => setIsEditingAction(true)}>Schedule Now</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          $1
`;
content = content.replace(quickInfoRegex, nextActionUI);

fs.writeFileSync('src/app/(app)/leads/LeadDrawer.tsx', content);
console.log('LeadDrawer updated.');
