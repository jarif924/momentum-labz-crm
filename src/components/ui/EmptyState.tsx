/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'

export function EmptyState({ icon: Icon, title, description, action }: { icon: any, title: string, description?: string, action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-neutral-50 rounded-[12px] border border-neutral-100 border-dashed">
      <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 mb-3">
        <Icon size={20} />
      </div>
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      {description && <p className="text-xs text-neutral-500 mt-1 max-w-[200px] mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
