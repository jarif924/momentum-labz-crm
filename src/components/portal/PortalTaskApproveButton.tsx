'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function PortalTaskApproveButton({ projectId, taskId }: { projectId: string; taskId: string }) {
  const [loading, setLoading] = useState(false)
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleApprove() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/portal/${projectId}/approve/${taskId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve')
      setApproved(true)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (approved) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success-50 text-success-700 text-xs font-semibold">
        <Check size={14} /> Approved!
      </span>
    )
  }

  return (
    <div>
      <button
        onClick={handleApprove}
        disabled={loading}
        className="flex items-center gap-2 h-9 px-4 rounded-md bg-accent-500 text-white hover:bg-accent-600 transition-colors font-medium text-sm disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Approve Milestone
      </button>
      {error && <p className="text-xs text-error-600 mt-1">{error}</p>}
    </div>
  )
}
