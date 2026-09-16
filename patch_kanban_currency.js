const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/leads/LeadsKanban.tsx', 'utf8');

const conversionRates = {
  'USD': 120, // 1 USD = 120 BDT
  'AUD': 80,  // 1 AUD = 80 BDT
  'EUR': 130, // 1 EUR = 130 BDT
  'BDT': 1    // Base
};

const topUI = `
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadsKanban({ leads, stages, onStageChange, onCardClick }: { leads: any[], stages: any[], onStageChange: (leadId: string, newStage: string) => void, onCardClick: (l: any) => void }) {
  
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
`;

const topUINew = `
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadsKanban({ leads, stages, onStageChange, onCardClick }: { leads: any[], stages: any[], onStageChange: (leadId: string, newStage: string) => void, onCardClick: (l: any) => void }) {
  
  const getBdtValue = (amount: number, currency: string) => {
    const rates: Record<string, number> = { 'USD': 120, 'AUD': 80, 'EUR': 130, 'BDT': 1 };
    return (amount || 0) * (rates[currency || 'BDT'] || 1);
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
`;
content = content.replace(topUI, topUINew);

const stageHeader = `<h3 className="text-sm font-medium text-neutral-900">{stage.name}</h3>`;
const stageHeaderNew = `
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-neutral-900">{stage.name}</h3>
                <span className="text-[10px] text-neutral-500 font-medium mt-0.5">
                  ৳ {stageLeads.reduce((acc, l) => acc + getBdtValue(l.deal_value, l.currency), 0).toLocaleString()}
                </span>
              </div>
`;
content = content.replace(/<h3 className="text-sm font-medium text-neutral-900">\{stage.name\}<\/h3>/g, stageHeaderNew);

fs.writeFileSync('src/app/(app)/leads/LeadsKanban.tsx', content);
console.log('Kanban currency patched');
