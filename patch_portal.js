const fs = require('fs');
let content = fs.readFileSync('src/app/portal/[id]/page.tsx', 'utf8');

// Add Lucide icons
content = content.replace(
  "import { CheckCircle2, Clock, ExternalLink, Calendar } from 'lucide-react'",
  "import { CheckCircle2, Clock, ExternalLink, Calendar, Video, CreditCard, TrendingUp, Users, DollarSign } from 'lucide-react'"
);

// Add the ROI Widget after Actionable Links
const roiWidget = `
        {/* The "Dead-Simple ROI" Widget */}
        {(project.total_ad_spend > 0 || project.leads_generated > 0) && (
          <div className="mb-12 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-[16px] p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={120} /></div>
            <div className="relative z-10">
              <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-accent-400" />
                Campaign ROI Snapshot
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                <div className="pt-4 sm:pt-0">
                  <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5"><DollarSign size={14}/> Total Ad Spend</p>
                  <p className="text-3xl font-light">$\\*{Number(project.total_ad_spend).toLocaleString()}</p>
                </div>
                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5"><Users size={14}/> Leads Generated</p>
                  <p className="text-3xl font-light">{\\*{project.leads_generated}}</p>
                </div>
                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5 text-accent-300"><TrendingUp size={14}/> Est. Value to You</p>
                  <p className="text-3xl font-light text-accent-400">$\\*{Number(project.est_roi_value).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Payment Routing */}
        <div className="mb-12 bg-white border border-neutral-200 rounded-[16px] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <CreditCard size={20} className="text-neutral-400" /> Payment & Billing
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {\\*{project.currency === 'BDT' ? 'Pay locally via bKash or Bank Transfer.' : 'Pay securely via Stripe or Wire Transfer.'}}
            </p>
          </div>
          <button className="px-5 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors">
            {\\*{project.currency === 'BDT' ? 'Pay with bKash' : 'Pay via Stripe'}}
          </button>
        </div>
`.replace(/\\\*/g, ''); // Little trick to escape JS template literal interpolation without escaping JSX `{}`

content = content.replace(
  "{/* Actionable Links */}",
  roiWidget + "\n        {/* Actionable Links */}"
);

// Add Loom Video to tasks
const videoEmbed = `
                            {\\*{task.loom_url && (
                              <div className="mt-4 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 p-2">
                                <div className="flex items-center gap-2 mb-2 px-2 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                                  <Video size={14} className="text-accent-500" /> Visual Update
                                </div>
                                <div className="aspect-video relative rounded-md overflow-hidden bg-black">
                                  <iframe src={\\*{task.loom_url.replace('/share/', '/embed/')}} frameBorder="0" allowFullScreen className="absolute inset-0 w-full h-full"></iframe>
                                </div>
                              </div>
                            )}}
`.replace(/\\\*/g, '');

content = content.replace(
  "{task.description && (",
  videoEmbed + "\n                            {task.description && ("
);

// Also need to fetch currency from leads
content = content.replace(
  "SELECT p.*, c.name as company_name, lc.full_name as client_name",
  "SELECT p.*, c.name as company_name, lc.full_name as client_name, l.currency"
);

fs.writeFileSync('src/app/portal/[id]/page.tsx', content);
console.log('Portal patched successfully with ROI, Smart Payments, and Video Milestones.');
