'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Image from 'next/image'

import { Mail, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const [mode, setMode] = useState<'password' | 'magic-link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      window.location.href = '/'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setMagicLinkSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Card — Section 8.6 spec: neutral-0 bg, 1px neutral-100 border, radius-lg, space-6 padding */}
      <div
        className="bg-neutral-0 border border-neutral-100 rounded-lg p-8"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="Momentum Labz"
            width={140}
            height={40}
            style={{ height: '40px', width: 'auto' }}
            priority
          />
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-h1 text-neutral-900 mb-1">Welcome back</h1>
          <p className="text-small text-neutral-500">Sign in to your Momentum Labz CRM</p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-md border border-neutral-200 p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => { setMode('password'); setError(null); setMagicLinkSent(false) }}
            className={`flex-1 h-8 rounded-sm text-body-medium transition-colors duration-[120ms] ease-out ${
              mode === 'password'
                ? 'bg-neutral-900 text-neutral-0'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode('magic-link'); setError(null); setMagicLinkSent(false) }}
            className={`flex-1 h-8 rounded-sm text-body-medium transition-colors duration-[120ms] ease-out flex items-center justify-center gap-1.5 ${
              mode === 'magic-link'
                ? 'bg-neutral-900 text-neutral-0'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <Sparkles size={14} />
            Magic Link
          </button>
        </div>

        {/* Magic link sent confirmation */}
        {magicLinkSent ? (
          <div className="rounded-md bg-success-bg border border-green-100 p-4 text-center">
            <p className="text-body-medium text-success-text">Check your email!</p>
            <p className="text-small text-neutral-500 mt-1">
              We sent a sign-in link to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={mode === 'password' ? handlePasswordSignIn : handleMagicLink}>
            {/* Email field — Section 8.2 spec */}
            <div className="mb-4">
              <label className="block text-small text-neutral-600 mb-2" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  strokeWidth={1.75}
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="fatin@momentumlabzz.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-neutral-0 border border-neutral-200 rounded-md text-body text-neutral-900 placeholder:text-neutral-300 transition-colors duration-[120ms] ease-out focus:outline-none focus:border-neutral-900"
                  style={{
                    '--focus-ring': '0 0 0 3px rgba(200,168,75,0.2)',
                  } as React.CSSProperties}
                  onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(200,168,75,0.2)' }}
                  onBlur={(e) => { e.target.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            {/* Password field — only shown in password mode */}
            {mode === 'password' && (
              <div className="mb-6">
                <label className="block text-small text-neutral-600 mb-2" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    strokeWidth={1.75}
                  />
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-neutral-0 border border-neutral-200 rounded-md text-body text-neutral-900 placeholder:text-neutral-300 transition-colors duration-[120ms] ease-out focus:outline-none focus:border-neutral-900"
                    onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(200,168,75,0.2)' }}
                    onBlur={(e) => { e.target.style.boxShadow = 'none' }}
                  />
                </div>
              </div>
            )}

            {mode === 'magic-link' && <div className="mb-6" />}

            {/* Error state — danger-text per design system */}
            {error && (
              <div className="mb-4 rounded-md bg-danger-bg border border-red-100 px-3 py-2">
                <p className="text-small text-danger-text">{error}</p>
              </div>
            )}

            {/* Primary button — Section 8.1: neutral-900 bg, neutral-0 text, 40px height, radius-md */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-neutral-900 text-neutral-0 rounded-md text-body-medium flex items-center justify-center gap-2 transition-colors duration-[120ms] ease-out hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" strokeWidth={1.75} />
              ) : (
                <>
                  {mode === 'password' ? 'Sign in' : 'Send magic link'}
                  <ArrowRight size={16} strokeWidth={1.75} />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-micro text-neutral-400 mt-6">
        MOMENTUM LABZ — INTERNAL CRM v1.0
      </p>
    </div>
  )
}
