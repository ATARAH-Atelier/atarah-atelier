import type { LucideIcon } from 'lucide-react'
import { PackageOpen } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/utils'

interface EmptyStateProps {
  action?: ReactNode
  className?: string
  description: string
  icon?: LucideIcon
  title: string
}

export function EmptyState({
  action,
  className,
  description,
  icon: Icon = PackageOpen,
  title,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-dashed border-atarah-gold-300 bg-atarah-cream-100/70 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-atarah-wine-900 shadow-sm">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="mt-5 font-display text-3xl font-bold text-atarah-wine-900">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-atarah-charcoal-600">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
