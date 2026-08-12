import { useQuery } from '@tanstack/react-query'
import {
  ClipboardList,
  Clock3,
  PackagePlus,
  Shirt,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatCard } from '../../components/admin/StatCard'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatCurrency, formatDateTime, getGreeting } from '../../lib/utils'
import {
  getDashboardStats,
  getRecentOrders,
} from '../../services/dashboard.service'

export function AdminDashboardPage() {
  const { isAdmin, isSeller, profile } = useAuth()

  useDocumentTitle('Resumen | Atarah Atelier')

  const dashboardScope = isSeller ? { sellerProfileId: profile?.id ?? null } : undefined

  const statsQuery = useQuery({
    queryFn: () => getDashboardStats(dashboardScope),
    queryKey: ['dashboard-stats', dashboardScope?.sellerProfileId ?? 'all'],
  })

  const recentOrdersQuery = useQuery({
    queryFn: () => getRecentOrders(dashboardScope),
    queryKey: ['dashboard-recent-orders', dashboardScope?.sellerProfileId ?? 'all'],
  })

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${getGreeting()}, ${profile?.full_name?.split(' ')[0] ?? 'Administrador'}`}
        description="Aquí tienes un resumen de la actividad de Atarah Atelier."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pedidos pendientes"
          value={statsQuery.data?.pendingOrders ?? 0}
          icon={Clock3}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title="En confección"
          value={statsQuery.data?.inProductionOrders ?? 0}
          icon={Shirt}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title="Listos para entregar"
          value={statsQuery.data?.readyOrders ?? 0}
          icon={ShoppingBag}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={isSeller ? 'Tus clientes' : 'Total de clientes'}
          value={statsQuery.data?.customersCount ?? 0}
          icon={Users}
          loading={statsQuery.isLoading}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-atarah-wine-900">
                Pedidos recientes
              </h2>
              <p className="text-sm text-atarah-charcoal-600">
                Últimos 5 pedidos registrados en Supabase.
              </p>
            </div>
            <Link
              to="/admin/pedidos"
              className="hidden h-9 items-center justify-center rounded-2xl border border-atarah-gold-300 bg-white px-3 text-sm font-semibold text-atarah-wine-900 transition hover:bg-atarah-cream-100 sm:inline-flex"
            >
              Ver todos
            </Link>
          </div>

          {recentOrdersQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p>{recentOrdersQuery.error.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void recentOrdersQuery.refetch()}
              >
                Intentar nuevamente
              </Button>
            </div>
          ) : recentOrdersQuery.data?.length ? (
            <div className="space-y-3">
              {recentOrdersQuery.data.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-4 rounded-2xl border border-atarah-gold-300/60 bg-atarah-cream-100/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-atarah-charcoal-900">
                      {order.order_number}
                    </p>
                    <p className="text-sm text-atarah-charcoal-600">
                      {order.customer_name ?? 'Cliente sin nombre'} •{' '}
                      {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <p className="text-sm font-semibold text-atarah-wine-900">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrdersQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl bg-atarah-cream-100"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No hay pedidos todavía"
              description="Los nuevos pedidos aparecerán aquí."
            />
          )}
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="font-display text-3xl font-bold text-atarah-wine-900">
              Accesos rápidos
            </h2>
            <p className="text-sm text-atarah-charcoal-600">
              Atajos para las tareas más frecuentes del taller.
            </p>
          </div>

          <div className="space-y-3">
            {isAdmin ? (
              <Link
                to="/admin/productos"
                className="flex items-center gap-4 rounded-2xl border border-atarah-gold-300/60 bg-white p-4 transition hover:bg-atarah-cream-100"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-atarah-wine-900 text-white">
                  <PackagePlus className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-atarah-charcoal-900">
                    Crear producto
                  </p>
                  <p className="text-sm text-atarah-charcoal-600">
                    Prepara la siguiente fase del catálogo.
                  </p>
                </div>
              </Link>
            ) : (
              <Link
                to="/admin/pedidos/nuevo"
                className="flex items-center gap-4 rounded-2xl border border-atarah-gold-300/60 bg-white p-4 transition hover:bg-atarah-cream-100"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-atarah-wine-900 text-white">
                  <ClipboardList className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-atarah-charcoal-900">
                    Registrar pedido
                  </p>
                  <p className="text-sm text-atarah-charcoal-600">
                    Crea una nueva venta y asígnala a tu gestión.
                  </p>
                </div>
              </Link>
            )}

            <Link
              to="/admin/pedidos"
              className="flex items-center gap-4 rounded-2xl border border-atarah-gold-300/60 bg-white p-4 transition hover:bg-atarah-cream-100"
            >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-atarah-gold-300 text-atarah-wine-950">
                <ShoppingBag className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-atarah-charcoal-900">
                  Revisar pedidos
                </p>
                <p className="text-sm text-atarah-charcoal-600">
                  Consulta el estado y seguimiento de cada orden.
                </p>
              </div>
            </Link>

            {isAdmin ? (
              <Link
                to="/admin/clientes"
                className="flex items-center gap-4 rounded-2xl border border-atarah-gold-300/60 bg-white p-4 transition hover:bg-atarah-cream-100"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-atarah-cream-100 text-atarah-wine-900">
                  <Users className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-atarah-charcoal-900">
                    Ver clientes
                  </p>
                  <p className="text-sm text-atarah-charcoal-600">
                    Accede a la base de clientes registrada.
                  </p>
                </div>
              </Link>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  )
}