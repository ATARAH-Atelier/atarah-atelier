import { useParams } from 'react-router-dom'

import { EmptyState } from '../../components/common/EmptyState'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getCheckoutSession } from '../../services/checkout.service'
import { OrderConfirmationCard } from '../../features/orders/components/OrderConfirmationCard'

export function OrderConfirmationPage() {
  const params = useParams()
  const orderNumber = params.orderNumber ?? ''
  const session = getCheckoutSession(orderNumber)

  useDocumentTitle('Pedido recibido | Atarah Atelier')

  if (!session) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <EmptyState title="Confirmación no disponible" description="No encontramos una sesión reciente para este pedido. Puedes consultarlo manualmente con tu teléfono." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <OrderConfirmationCard session={session} />
    </div>
  )
}
