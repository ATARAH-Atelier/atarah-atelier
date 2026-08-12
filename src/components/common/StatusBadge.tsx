import type { OrderStatus } from '../../types/database'
import { cn, translateOrderStatus } from '../../lib/utils'

interface StatusBadgeProps {
  status: OrderStatus
}

const badgeClasses: Record<OrderStatus, string> = {
  pending: 'border-amber-200 bg-amber-100 text-amber-800',
  confirmed: 'border-sky-200 bg-sky-100 text-sky-800',
  waiting_for_payment: 'border-orange-200 bg-orange-100 text-orange-800',
  in_production: 'border-violet-200 bg-violet-100 text-violet-800',
  ready: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  delivered: 'border-atarah-gold-300 bg-atarah-gold-300/60 text-atarah-wine-950',
  cancelled: 'border-rose-200 bg-rose-100 text-rose-800',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        badgeClasses[status],
      )}
    >
      {translateOrderStatus(status)}
    </span>
  )
}
