import { Link } from 'react-router-dom'

import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { formatCurrency } from '../../../lib/utils'
import type { CartItem } from '../../../types/cart'
import type { AppliedDiscount } from '../../../types/database'

interface CheckoutOrderSummaryProps {
  appliedDiscount?: AppliedDiscount | null
  items: CartItem[]
  total: number
}

function formatSizeSummary(item: CartItem) {
  const parts = [
    item.selectedTopSize ? `Blusa: ${item.selectedTopSize}` : null,
    item.selectedBottomSize ? `Pantalón: ${item.selectedBottomSize}` : null,
    item.selectedColor ?? 'Sin color',
    `${item.quantity} uds.`,
  ].filter(Boolean)

  return parts.join(' • ')
}

export function CheckoutOrderSummary({ appliedDiscount, items, total }: CheckoutOrderSummaryProps) {
  const finalTotal = appliedDiscount?.final_total ?? total

  return (
    <Card className="space-y-4 lg:sticky lg:top-28">
      <div>
        <p className="font-display text-3xl font-bold text-atarah-wine-900">Resumen</p>
        <p className="mt-1 text-sm text-atarah-charcoal-600">El total será recalculado por el servidor antes de confirmar el pedido.</p>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.cartItemId} className="flex gap-3 border-b border-atarah-gold-300/50 pb-4">
            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-2xl object-cover" /> : <div className="h-16 w-16 rounded-2xl bg-atarah-cream-100" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-atarah-charcoal-900">{item.name}</p>
              <p className="text-sm text-atarah-charcoal-600">{formatSizeSummary(item)}</p>
              <p className="text-sm font-medium text-atarah-wine-900">{formatCurrency(item.lineTotal)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-atarah-charcoal-700">
          <span>Subtotal</span>
          <span>{formatCurrency(total)}</span>
        </div>
        {appliedDiscount ? (
          <div className="flex items-center justify-between text-sm text-emerald-700">
            <span>Descuento ({appliedDiscount.code})</span>
            <span>- {formatCurrency(appliedDiscount.discount_amount)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between text-lg font-semibold text-atarah-wine-900">
          <span>Total estimado</span>
          <span>{formatCurrency(finalTotal)}</span>
        </div>
      </div>
      <Link to="/carrito">
        <Button variant="outline" className="w-full">Volver al carrito</Button>
      </Link>
    </Card>
  )
}