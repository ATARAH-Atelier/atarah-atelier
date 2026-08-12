import type { LucideIcon } from 'lucide-react'

import { Card } from '../ui/Card'
import { Spinner } from '../ui/Spinner'

interface StatCardProps {
  description?: string
  icon: LucideIcon
  loading?: boolean
  title: string
  value: number | string
}

export function StatCard({
  description,
  icon: Icon,
  loading = false,
  title,
  value,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-atarah-gold-300/15 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-atarah-charcoal-600">{title}</p>
          <div className="mt-3 flex min-h-10 items-center">
            {loading ? (
              <Spinner className="text-atarah-wine-900" />
            ) : (
              <p className="font-display text-4xl font-bold text-atarah-wine-900">
                {value}
              </p>
            )}
          </div>
          {description ? (
            <p className="mt-2 text-sm text-atarah-charcoal-600">{description}</p>
          ) : null}
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-atarah-wine-900 text-white shadow-sm">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  )
}
