import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted'
}

export function Card({
  children,
  className,
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border p-6 shadow-sm',
        variant === 'default'
          ? 'border-atarah-gold-300/70 bg-white'
          : 'border-atarah-gold-300/50 bg-atarah-cream-100/80',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
