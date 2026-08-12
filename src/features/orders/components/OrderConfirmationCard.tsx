import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { buildWhatsAppUrl, getOrderStatusDescription, getOrderStatusLabel } from '../../../lib/public-utils'
import { formatCurrency } from '../../../lib/utils'
import type { CheckoutSession } from '../../../types/checkout'

export function OrderConfirmationCard({ session }: { session: CheckoutSession }) {
  const whatsappUrl = buildWhatsAppUrl(`Hola, realicé el pedido ${session.order.order_number} en Atarah Atelier.\n\nQuisiera confirmar los detalles de mi pedido.\n\nTotal estimado: ${formatCurrency(session.order.total)}`)

  return (
    <Card className="mx-auto max-w-3xl space-y-6 p-8 text-center">
      <div>
        <p className="font-display text-5xl font-bold text-atarah-wine-900">Pedido recibido</p>
        <p className="mt-3 text-base leading-7 text-atarah-charcoal-600">Recibimos tu solicitud. El equipo de Atarah Atelier revisará los detalles y se comunicará contigo para confirmar disponibilidad, medidas, entrega y pago.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-atarah-cream-100 p-4">
          <p className="text-sm text-atarah-charcoal-600">Número</p>
          <p className="mt-1 font-semibold text-atarah-charcoal-900">{session.order.order_number}</p>
        </div>
        <div className="rounded-2xl bg-atarah-cream-100 p-4">
          <p className="text-sm text-atarah-charcoal-600">Total</p>
          <p className="mt-1 font-semibold text-atarah-charcoal-900">{formatCurrency(session.order.total)}</p>
        </div>
        <div className="rounded-2xl bg-atarah-cream-100 p-4">
          <p className="text-sm text-atarah-charcoal-600">Estado</p>
          <p className="mt-1 font-semibold text-atarah-charcoal-900">{getOrderStatusLabel(session.order.status)}</p>
        </div>
      </div>
      <p className="text-sm text-atarah-charcoal-600">{getOrderStatusDescription(session.order.status)}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to={`/pedido/${session.order.order_number}`}><Button>Consultar pedido</Button></Link>
        <Link to="/productos"><Button variant="outline">Volver al catálogo</Button></Link>
        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noreferrer"><Button variant="secondary" leftIcon={<MessageCircle className="size-4" aria-hidden="true" />}>WhatsApp</Button></a>
        ) : null}
      </div>
    </Card>
  )
}
