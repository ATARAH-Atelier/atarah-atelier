import { getOrderStatusDescription, getOrderStatusLabel } from '../../lib/public-utils'
import type { OrderTimelineEntry } from '../../types/public-order'

export function OrderStatusTimeline({ timeline }: { timeline: OrderTimelineEntry[] }) {
  return (
    <div className="space-y-4">
      {timeline.map((entry, index) => (
        <div key={`${entry.status}-${entry.created_at ?? index}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="mt-1 size-3 rounded-full bg-atarah-wine-900" />
            {index < timeline.length - 1 ? <span className="h-full w-px bg-atarah-gold-300" /> : null}
          </div>
          <div className="pb-4">
            <p className="font-semibold text-atarah-charcoal-900">{getOrderStatusLabel(entry.status)}</p>
            <p className="text-sm text-atarah-charcoal-600">{getOrderStatusDescription(entry.status)}</p>
            {entry.created_at ? <p className="mt-1 text-xs text-atarah-charcoal-600">{new Date(entry.created_at).toLocaleString('es-VE')}</p> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
