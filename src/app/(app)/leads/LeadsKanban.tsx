/* eslint-disable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadsKanban({ leads, stages, onStageChange, onCardClick }: { leads: any[], stages: any[], onStageChange: (leadId: string, newStage: string) => void, onCardClick: (l: any) => void }) {
  
  const getBdtValue = (amount: number, currency: string) => {
    const rates: Record<string, number> = { 'USD': 120, 'AUD': 80, 'EUR': 130, 'BDT': 1 };
    return (amount || 0) * (rates[currency || 'BDT'] || 1);
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      onStageChange(leadId, newStage);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
      {stages.map(stage => {
        const stageLeads = leads.filter(l => l.stage === stage.name);
        
        return (
          <div 
            key={stage.name} 
            className="flex-shrink-0 w-[300px] flex flex-col bg-neutral-50 rounded-[12px] border border-neutral-100"
            onDrop={(e) => handleDrop(e, stage.name)}
            onDragOver={handleDragOver}
          >
            <div className="p-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50 rounded-t-[12px]">
              
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-neutral-900">{stage.name}</h3>
                <span className="text-[10px] text-neutral-500 font-medium mt-0.5">
                  ৳ {stageLeads.reduce((acc, l) => acc + getBdtValue(l.deal_value, l.currency), 0).toLocaleString()}
                </span>
              </div>

              <span className="text-xs font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                {stageLeads.length}
              </span>
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-2">
              {stageLeads.map(lead => (
                <div 
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onClick={() => onCardClick(lead)}
                  className="bg-neutral-0 p-3 rounded-[8px] border border-neutral-100 shadow-sm cursor-grab active:cursor-grabbing hover:border-neutral-200 transition-colors"
                >
                  <div className="font-medium text-sm text-neutral-900 mb-1">
                    {lead.contacts?.full_name || 'Unknown'}
                  </div>
                  {lead.companies?.name && (
                    <div className="text-xs text-neutral-500 mb-2">{lead.companies.name}</div>
                  )}
                  {lead.deal_value && (
                    <div className="text-xs font-semibold text-success-text bg-success-bg inline-block px-1.5 py-0.5 rounded">
                      {lead.currency} {lead.deal_value.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
