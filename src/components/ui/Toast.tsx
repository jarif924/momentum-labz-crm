'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: number; kind: ToastKind; message: string }

const ToastContext = createContext<((kind: ToastKind, message: string) => void) | null>(null)

const BAR: Record<ToastKind, string> = {
  success: 'bg-success-text',
  error: 'bg-danger-text',
  info: 'bg-info-text',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t.slice(-3), { id, kind, message }])
    setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 3500)
  }, [dismiss])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 w-[min(360px,calc(100vw-48px))]" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="toast-enter relative flex items-start gap-3 overflow-hidden rounded-md border border-neutral-100 bg-neutral-0 py-3 pl-4 pr-3 shadow-md"
          >
            <span className={`absolute left-0 top-0 h-full w-[3px] ${BAR[t.kind]}`} />
            <p className="flex-1 text-small text-neutral-900">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded-sm p-0.5 text-neutral-400 transition-colors duration-120 hover:text-neutral-900"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const push = useContext(ToastContext)
  if (!push) throw new Error('useToast must be used inside <ToastProvider>')
  return useMemo(() => ({
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m),
    info: (m: string) => push('info', m),
  }), [push])
}
