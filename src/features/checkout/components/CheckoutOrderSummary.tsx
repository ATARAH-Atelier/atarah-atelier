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

const mobilePaymentDetails = [
  { label: 'Telefono', value: '0414-0491999' },
  { label: 'Cedula', value: '11.711.665' },
  { label: 'Banco', value: 'BNC' },
] as const

function formatSizeSummary(item: CartItem) {
  const parts = [
    item.selectedTopSize ? `Blusa: ${item.selectedTopSize}` : null,
    item.selectedBottomSize ? `Pantalon: ${item.selectedBottomSize}` : null,
    item.selectedColor ?? 'Sin color',
    `${item.quantity} uds.`,
  ].filter(Boolean)

  return parts.join(' - ')
}

export function CheckoutOrderSummary({ appliedDiscount, items, total }: CheckoutOrderSummaryProps) {
  const finalTotal = appliedDiscount?.final_total ?? total

  return (
    <Card className="space-y-4 lg:sticky lg:top-28">
      <div>
        <p className="font-display text-3xl font-bold text-atarah-wine-900">Resumen</p>
        <p className="mt-1 text-sm text-atarah-charcoal-600">El total sera recalculado por el servidor antes de confirmar el pedido.</p>
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
      <div className="rounded-2xl border border-atarah-gold-300/60 bg-atarah-cream-50 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-atarah-wine-800">
          Pago movil
        </p>
        <div className="mt-3 space-y-2 text-sm text-atarah-charcoal-700">
          {mobilePaymentDetails.map((detail) => (
            <div key={detail.label} className="flex items-center justify-between gap-3">
              <span className="text-atarah-charcoal-500">{detail.label}</span>
              <span className="font-semibold text-atarah-charcoal-900">{detail.value}</span>
            </div>
          ))}
        </div>
      </div>
      <Link to="/carrito">
        <Button variant="outline" className="w-full">Volver al carrito</Button>
      </Link>
    </Card>
  )
}
