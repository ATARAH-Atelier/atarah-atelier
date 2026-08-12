import { useQuery } from '@tanstack/react-query'
import {
  Hash,
  Phone,
  Search,
  Package,
  Calendar,
  DollarSign,
  CreditCard,
  AlertTriangle,
  ShoppingBag,
  Ruler,
  Palette,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Alert } from '../../components/public/Alert'
import { OrderStatusTimeline } from '../../components/public/OrderStatusTimeline'
import { StatusBadge } from '../../components/common/StatusBadge'
import { EmptyState } from '../../components/common/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { orderLookupSchema } from '../../features/orders/schemas/order-lookup.schema'
import { formatCurrency, formatDate } from '../../lib/utils'
import { getCustomerOrderStatus, getGuestOrderStatus } from '../../services/public-orders.service'

export function OrderTrackingPage() {
  const params = useParams()
  const { isAuthenticated, user } = useAuth()
  const routeOrderNumber = params.orderNumber ?? ''
  const [orderNumber, setOrderNumber] = useState(routeOrderNumber)
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState<{ orderNumber: string; phone: string } | null>(null)
  const [errors, setErrors] = useState<{ order_number?: string; phone?: string }>({})

  useDocumentTitle('Consultar pedido | Atarah Atelier')

  const shouldUseDirectCustomerView = Boolean(isAuthenticated && user?.id && routeOrderNumber)

  const trackingQuery = useQuery({
    enabled: shouldUseDirectCustomerView || Boolean(submitted),
    queryFn: () => {
      if (shouldUseDirectCustomerView && user?.id) {
        return getCustomerOrderStatus(routeOrderNumber, user.id)
      }
      return getGuestOrderStatus(submitted?.orderNumber ?? '', submitted?.phone ?? '')
    },
    queryKey: shouldUseDirectCustomerView
      ? ['customer-order-status', routeOrderNumber, user?.id]
      : ['public-order-status', submitted],
    retry: 0,
  })

  function handleLookup() {
    const parsed = orderLookupSchema.safeParse({ order_number: orderNumber, phone })

    if (!parsed.success) {
      const nextErrors: { order_number?: string; phone?: string } = {}
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as 'order_number' | 'phone'
        nextErrors[field] = issue.message
      })
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSubmitted({ orderNumber: parsed.data.order_number, phone: parsed.data.phone })
  }

  const safeOrder = useMemo(() => trackingQuery.data, [trackingQuery.data])

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#fcf8f2_0%,#f5ede3_40%,#fcf8f2_100%)]">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 lg:px-8">
        {/* Cabecera */}
        <div className="text-center sm:text-left">
          <h1 className="font-display text-4xl font-bold text-atarah-wine-900 sm:text-5xl">
            {shouldUseDirectCustomerView ? 'Detalle de tu pedido' : 'Consultar pedido'}
          </h1>
          <p className="mt-3 text-base text-atarah-charcoal-600 max-w-2xl">
            {shouldUseDirectCustomerView
              ? 'Aquí puedes ver el estado real de tu pedido, lo abonado y el saldo pendiente.'
              : 'Ingresa tu número de pedido y teléfono para ver el estado sin exponer información de otros clientes.'}
          </p>
        </div>

        {/* Formulario de búsqueda (solo vista pública) */}
        {!shouldUseDirectCustomerView && (
          <Card className="overflow-hidden border-0 bg-white p-6 shadow-xl shadow-atarah-gold-200/20 ring-1 ring-atarah-gold-200/50 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-atarah-wine-100">
                <Search className="size-5 text-atarah-wine-700" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-atarah-wine-900">Buscar pedido</h2>
                <p className="text-sm text-atarah-charcoal-600">Completa los datos para consultar el estado</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <Hash className="pointer-events-none absolute left-4 top-[2.85rem] size-4 text-atarah-charcoal-400" />
                <Input
                  id="orderNumber"
                  label="Número de pedido"
                  placeholder="Ej. ATAH-001"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  error={errors.order_number}
                  className="pl-11"
                />
              </div>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-[2.85rem] size-4 text-atarah-charcoal-400" />
                <Input
                  id="phone"
                  label="Teléfono registrado"
                  placeholder="Ej. 04121234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={errors.phone}
                  className="pl-11"
                />
              </div>
            </div>

            <Button onClick={handleLookup} className="mt-5 w-full sm:w-auto" size="lg" leftIcon={<Search className="size-5" />}>
              Consultar pedido
            </Button>
          </Card>
        )}

        {/* Estados de carga y error */}
        {trackingQuery.isLoading && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-3xl bg-white" />
            <div className="h-64 animate-pulse rounded-3xl bg-white" />
          </div>
        )}

        {trackingQuery.isError && (
          <Alert tone="error" className="mt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 mt-0.5" />
              <div>
                <p className="font-medium">Pedido no encontrado</p>
                <p className="text-sm mt-1">
                  {trackingQuery.error instanceof Error
                    ? trackingQuery.error.message
                    : 'Verifica que los datos sean correctos e inténtalo de nuevo.'}
                </p>
              </div>
            </div>
          </Alert>
        )}

        {/* Contenido del pedido encontrado */}
        {safeOrder ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* Resumen del pedido */}
            <Card className="border-0 bg-white p-6 shadow-xl shadow-atarah-gold-200/20 ring-1 ring-atarah-gold-200/50 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-2xl font-bold text-atarah-wine-900">Resumen del pedido</h2>
                <StatusBadge status={safeOrder.status} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl bg-atarah-cream-50 p-3">
                  <Hash className="size-5 text-atarah-wine-700" />
                  <div>
                    <p className="text-xs text-atarah-charcoal-500">Número</p>
                    <p className="font-semibold text-sm">{safeOrder.order_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-atarah-cream-50 p-3">
                  <Calendar className="size-5 text-atarah-wine-700" />
                  <div>
                    <p className="text-xs text-atarah-charcoal-500">Creado</p>
                    <p className="font-semibold text-sm">{formatDate(safeOrder.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-atarah-cream-50 p-3">
                  <DollarSign className="size-5 text-atarah-wine-700" />
                  <div>
                    <p className="text-xs text-atarah-charcoal-500">Total</p>
                    <p className="font-semibold text-sm">{formatCurrency(safeOrder.total)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-atarah-cream-50 p-3">
                  <CreditCard className="size-5 text-atarah-wine-700" />
                  <div>
                    <p className="text-xs text-atarah-charcoal-500">Abonado</p>
                    <p className="font-semibold text-sm text-emerald-700">{formatCurrency(safeOrder.paid_amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-atarah-cream-50 p-3">
                  <AlertTriangle className="size-5 text-atarah-wine-700" />
                  <div>
                    <p className="text-xs text-atarah-charcoal-500">Saldo pendiente</p>
                    <p className={`font-semibold text-sm ${safeOrder.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatCurrency(safeOrder.balance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items del pedido */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-atarah-charcoal-600">Productos</h3>
                  <span className="rounded-full bg-atarah-wine-100 px-3 py-1 text-xs font-semibold text-atarah-wine-900">
                    {safeOrder.items.length} seleccionados
                  </span>
                </div>
                <p className="text-sm text-atarah-charcoal-600">Lo que compraste en este pedido:</p>
                {safeOrder.items.length > 0 ? (
                  <div className="space-y-3">
                    {safeOrder.items.map((item, index) => (
                      <div
                        key={`${item.product_name_snapshot}-${index}`}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-atarah-gold-200 bg-atarah-cream-50 p-4"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-atarah-charcoal-900">{item.product_name_snapshot}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-atarah-charcoal-600">
                            {item.blouse_size && (
                              <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                <Ruler className="size-3" /> Blusa: {item.blouse_size}
                              </span>
                            )}
                            {item.pants_size && (
                              <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                <Ruler className="size-3" /> Pantalon: {item.pants_size}
                              </span>
                            )}
                            {item.color_name && (
                              <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                <Palette className="size-3" /> {item.color_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                              <Package className="size-3" /> {item.quantity} uds.
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-atarah-wine-900">{formatCurrency(item.line_total)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-atarah-gold-300 bg-atarah-cream-50 p-4 text-sm text-atarah-charcoal-600">
                    Este pedido no tiene productos visibles en el detalle todavia.
                  </div>
                )}
              </div>

            </Card>

            {/* Historial y línea de tiempo */}
            <Card className="border-0 bg-white p-6 shadow-xl shadow-atarah-gold-200/20 ring-1 ring-atarah-gold-200/50 sm:p-8">
              <h2 className="font-display text-2xl font-bold text-atarah-wine-900 mb-5">Historial de estados</h2>
              <OrderStatusTimeline
                timeline={
                  safeOrder.timeline.length
                    ? safeOrder.timeline
                    : [{ created_at: safeOrder.created_at, status: safeOrder.status }]
                }
              />
            </Card>
          </div>
        ) : submitted && !trackingQuery.isLoading && !trackingQuery.isError ? (
          <EmptyState
            icon={ShoppingBag}
            title="Sin datos del pedido"
            description="Intenta nuevamente con la información correcta."
          />
        ) : null}
      </div>
    </div>
  )
}