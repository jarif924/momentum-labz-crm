const fs = require('fs');

// 1. Fix LeadFormModal.tsx
let modalPath = 'src/app/(app)/leads/LeadFormModal.tsx';
let modalContent = fs.readFileSync(modalPath, 'utf8');

// Fix tags initialization
modalContent = modalContent.replace(/setFormData\(\{([^}]*)\}\);/g, (match, inner) => {
    if (!inner.includes('tags:')) {
        return `setFormData({${inner}, tags: []});`;
    }
    return match;
});
modalContent = modalContent.replace(/tags: lead\.tags \|\| \[\]/, 'tags: lead?.tags || []');
// If lead is passed, map the tags properly
modalContent = modalContent.replace(
  `setFormData(lead);`,
  `setFormData({ ...lead, tags: lead.lead_tags?.map((lt: any) => lt.tags?.id).filter(Boolean) || [] });`
);

// Fix grid for mobile
modalContent = modalContent.replace(/grid grid-cols-2 gap-4/g, 'grid grid-cols-1 sm:grid-cols-2 gap-4');

fs.writeFileSync(modalPath, modalContent);
console.log('Fixed LeadFormModal.tsx');


// 2. Fix LeadDrawer.tsx mobile responsiveness
let drawerPath = 'src/app/(app)/leads/LeadDrawer.tsx';
let drawerContent = fs.readFileSync(drawerPath, 'utf8');

drawerContent = drawerContent.replace(/w-\[480px\]/g, 'w-full md:w-[480px]');

fs.writeFileSync(drawerPath, drawerContent);
console.log('Fixed LeadDrawer.tsx');

// 3. Create global error.tsx
const errorTsx = `"use client"

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App Error:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-danger-50 text-danger-600 p-4 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h2 className="text-xl font-semibold text-neutral-900 mb-2">Something went wrong!</h2>
      <p className="text-sm text-neutral-500 max-w-md mb-6">
        {error.message || 'An unexpected error occurred in the application.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
`;
fs.writeFileSync('src/app/(app)/error.tsx', errorTsx);
console.log('Created error.tsx');

