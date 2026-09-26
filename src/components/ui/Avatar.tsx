import React from 'react'

interface AvatarProps {
  name?: string
  url?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, url, size = 'md', className = '' }: AvatarProps) {
  const dims = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-[11px]',
    lg: 'w-10 h-10 text-body-medium',
  }[size]

  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]!.toUpperCase())
    .join('') || '?'

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'Avatar'}
        className={`inline-block rounded-full object-cover shrink-0 ${dims} ${className}`}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 font-bold tracking-wider ${dims} ${className}`}
    >
      {initials}
    </span>
  )
}
