import type { ReactNode } from 'react'

interface PageHeaderProps {
  action?: ReactNode
  description?: string
  title: string
}

export function PageHeader({ action, description, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-atarah-wine-900">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-atarah-charcoal-600">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
