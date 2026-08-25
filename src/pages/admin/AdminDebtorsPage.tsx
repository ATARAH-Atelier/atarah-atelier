import { useQuery } from '@tanstack/react-query'
import {
  CircleDollarSign,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
} from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatCurrency } from '../../lib/utils'
import { getReportsSnapshot, getStatusLabel } from '../../services/reports.service'
import type { ReportsDebtorPoint } from '../../types/reports'

type DebtorSort = 'outstanding_desc' | 'recent_desc' | 'orders_desc' | 'name_asc'
type DebtorBalanceView = 'all' | 'delivered'

function formatDebtorItems(items: Array<{ productName: string; quantity: number }>) {
  return items
    .slice(0, 4)
    .map((item) => `${item.productName} x${item.quantity}`)
    .join(' | ')
}

function getLatestOrderTimestamp(debtor: ReportsDebtorPoint) {
  return debtor.orders.reduce((latest, order) => {
    const timestamp = order.createdAt ? new Date(order.createdAt).getTime() : 0
    return Math.max(latest, timestamp)
  }, 0)
}

export function AdminDebtorsPage() {
  useDocumentTitle('Deudores | Atarah Atelier')

  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [sortBy, setSortBy] = useState<DebtorSort>('outstanding_desc')
  const [balanceView, setBalanceView] = useState<DebtorBalanceView>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const reportsQuery = useQuery({
    queryFn: getReportsSnapshot,
    queryKey: ['admin-reports'],
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await reportsQuery.refetch()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const debtors = reportsQuery.data?.debtors ?? []
  const stateOptions = Array.from(new Set(debtors.map((debtor) => debtor.state?.trim()).filter(Boolean))).sort((a, b) =>
    (a ?? '').localeCompare(b ?? '', 'es'),
  ) as string[]

  const cityOptions = Array.from(
    new Set(
      debtors
        .filter((debtor) => stateFilter === 'all' || (debtor.state?.trim() ?? '') === stateFilter)
        .map((debtor) => debtor.city?.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => (a ?? '').localeCompare(b ?? '', 'es')) as string[]

  const normalizedSearch = search.trim().toLocaleLowerCase('es')
  const filteredDebtors = debtors
    .filter((debtor) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          debtor.name,
          debtor.phone,
          debtor.email,
          debtor.city,
          debtor.state,
          debtor.address,
          ...debtor.orders.map((order) => order.orderNumber),
          ...debtor.orders.flatMap((order) => order.items.map((item) => item.productName)),
        ]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase('es').includes(normalizedSearch))

      const matchesState = stateFilter === 'all' || (debtor.state?.trim() ?? '') === stateFilter
      const matchesCity = cityFilter === 'all' || (debtor.city?.trim() ?? '') === cityFilter

      return matchesSearch && matchesState && matchesCity
    })
    .sort((first, second) => {
      if (sortBy === 'name_asc') {
        return first.name.localeCompare(second.name, 'es')
      }

      if (sortBy === 'orders_desc') {
        return second.orders.length - first.orders.length || second.outstanding - first.outstanding
      }

      if (sortBy === 'recent_desc') {
        return getLatestOrderTimestamp(second) - getLatestOrderTimestamp(first)
      }

      return second.outstanding - first.outstanding
    })

  const visibleDebtors = filteredDebtors
    .map((debtor) => {
      const visibleOrders =
        balanceView === 'delivered'
          ? debtor.orders.filter((order) => order.status === 'delivered')
          : debtor.orders

      const visibleOutstanding = visibleOrders.reduce((sum, order) => sum + order.balance, 0)

      return {
        ...debtor,
        orders: visibleOrders,
        outstanding: visibleOutstanding,
      }
    })
    .filter((debtor) => debtor.orders.length > 0 && debtor.outstanding > 0)

  const totalOutstanding = visibleDebtors.reduce((sum, debtor) => sum + debtor.outstanding, 0)
  const totalOrders = visibleDebtors.reduce((sum, debtor) => sum + debtor.orders.length, 0)

  if (reportsQuery.isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Deudores" description="Seguimiento de clientes con saldo pendiente." />
        <Card className="border-rose-200 bg-rose-50 p-6 text-rose-800">
          <p>{reportsQuery.error.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
            Reintentar
          </Button>
        </Card>
      </div>
    )
  }

  if (reportsQuery.isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Deudores" description="Cargando clientes con saldo pendiente..." />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Deudores"
          description="Panel de cobranza con detalle de quien debe, cuanto debe, por que debe y como contactarle."
        />
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          onClick={handleRefresh}
          className="mt-2 border-atarah-gold-300/60"
        >
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-atarah-gold-200 p-5 shadow-sm">
          <p className="text-sm text-atarah-charcoal-600">
            {balanceView === 'delivered' ? 'Clientes con deuda entregada' : 'Clientes con deuda'}
          </p>
          <p className="mt-2 text-3xl font-bold text-atarah-wine-900">{visibleDebtors.length}</p>
        </Card>
        <Card className="border-atarah-gold-200 p-5 shadow-sm">
          <p className="text-sm text-atarah-charcoal-600">
            {balanceView === 'delivered' ? 'Saldo pendiente entregado' : 'Saldo pendiente filtrado'}
          </p>
          <p className="mt-2 text-3xl font-bold text-atarah-wine-900">{formatCurrency(totalOutstanding)}</p>
        </Card>
        <Card className="border-atarah-gold-200 p-5 shadow-sm">
          <p className="text-sm text-atarah-charcoal-600">
            {balanceView === 'delivered' ? 'Pedidos entregados con saldo' : 'Pedidos con saldo'}
          </p>
          <p className="mt-2 text-3xl font-bold text-atarah-wine-900">{totalOrders}</p>
        </Card>
      </div>

      <Card className="border-atarah-gold-200 p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-atarah-charcoal-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente, telefono, correo, pedido o producto"
              className="pl-11"
            />
          </div>

          <Select
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value)
              setCityFilter('all')
            }}
          >
            <option value="all">Todos los estados</option>
            {stateOptions.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>

          <Select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
            <option value="all">Todas las ciudades</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>

          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as DebtorSort)}>
            <option value="outstanding_desc">Mayor saldo</option>
            <option value="recent_desc">Mas reciente</option>
            <option value="orders_desc">Mas pedidos</option>
            <option value="name_asc">Nombre A-Z</option>
          </Select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={balanceView === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setBalanceView('all')}
          >
            Todo lo pendiente
          </Button>
          <Button
            variant={balanceView === 'delivered' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setBalanceView('delivered')}
          >
            Solo pedidos entregados
          </Button>
        </div>
      </Card>

      {visibleDebtors.length ? (
        <div className="space-y-4">
          {visibleDebtors.map((debtor) => (
            <Card key={debtor.customerId} className="border-atarah-gold-200 p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-semibold text-atarah-charcoal-900">{debtor.name}</p>
                    <p className="mt-1 text-sm font-semibold text-rose-700">
                      Debe {formatCurrency(debtor.outstanding)}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-atarah-charcoal-600 sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <Phone className="size-4 text-atarah-wine-700" />
                      {debtor.phone ?? 'Sin telefono'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="size-4 text-atarah-wine-700" />
                      {debtor.email ?? 'Sin correo'}
                    </p>
                    <p className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="size-4 text-atarah-wine-700" />
                      {[debtor.city, debtor.state, debtor.address].filter(Boolean).join(', ') || 'Sin direccion registrada'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[280px]">
                  <div className="rounded-2xl bg-atarah-cream-50 px-4 py-3 text-sm">
                    <p className="text-atarah-charcoal-500">
                      {balanceView === 'delivered' ? 'Pedidos entregados con saldo' : 'Pedidos con saldo'}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-atarah-wine-900">{debtor.orders.length}</p>
                  </div>
                  <div className="rounded-2xl bg-atarah-cream-50 px-4 py-3 text-sm">
                    <p className="text-atarah-charcoal-500">Ultimo movimiento</p>
                    <p className="mt-1 text-sm font-semibold text-atarah-wine-900">
                      {getLatestOrderTimestamp(debtor)
                        ? new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(getLatestOrderTimestamp(debtor))
                        : 'Sin fecha'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {debtor.orders.map((order) => (
                  <div key={order.orderId} className="rounded-2xl bg-atarah-cream-50 p-4 ring-1 ring-atarah-gold-200/60">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold text-atarah-charcoal-900">{order.orderNumber}</p>
                        <p className="mt-1 text-sm text-atarah-charcoal-600">
                          {getStatusLabel(order.status)} | Total {formatCurrency(order.total)} | Saldo {formatCurrency(order.balance)}
                        </p>
                        <p className="mt-2 text-sm text-atarah-charcoal-600">
                          Debe por: {order.items.length ? formatDebtorItems(order.items) : 'Pedido sin detalle visible'}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-atarah-charcoal-600 lg:text-right">
                        <div className="flex items-center gap-2 lg:justify-end">
                          <ShoppingBag className="size-4 text-atarah-wine-700" />
                          <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} piezas</span>
                        </div>
                        <p>
                          {order.createdAt
                            ? new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(order.createdAt))
                            : 'Fecha no disponible'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CircleDollarSign}
          title="No hay deudores con esos filtros"
          description={
            balanceView === 'delivered'
              ? 'No hay pedidos entregados con saldo pendiente para esos filtros.'
              : 'Prueba quitando filtros o usando otra busqueda para encontrar pedidos pendientes.'
          }
        />
      )}
    </div>
  )
}
