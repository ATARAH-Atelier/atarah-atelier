import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  CircleDollarSign,
  Clock3,
  PackageSearch,
  Palette,
  ReceiptText,
  RefreshCw,
  Ruler,
  Shirt,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatCurrency } from '../../lib/utils'
import {
  getReportsSnapshot,
  getStatusCollectionWeight,
  getStatusLabel,
} from '../../services/reports.service'

const METRIC_ICONS = [CircleDollarSign, ReceiptText, Clock3, TrendingUp, Users, BarChart3]

const INSIGHT_TONE_CLASSES: Record<string, { bg: string; text: string; iconBg: string }> = {
  charcoal: {
    bg: 'bg-white',
    text: 'text-atarah-charcoal-900',
    iconBg: 'bg-atarah-charcoal-100',
  },
  gold: {
    bg: 'bg-white',
    text: 'text-atarah-wine-950',
    iconBg: 'bg-atarah-gold-100',
  },
  wine: {
    bg: 'bg-white',
    text: 'text-atarah-wine-900',
    iconBg: 'bg-atarah-wine-100',
  },
}

function formatMetricValue(title: string, value: number) {
  if (
    title.includes('Facturaci') ||
    title.includes('Cobrado') ||
    title.includes('Saldo') ||
    title.includes('Ticket')
  ) {
    return formatCurrency(value)
  }
  return new Intl.NumberFormat('es-VE').format(value)
}

function normalizeTooltipValue(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function AdminReportsPage() {
  useDocumentTitle('Reportes | Atarah Atelier')
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

  const snapshot = reportsQuery.data

  if (reportsQuery.isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Reportes" description="Panel de control del taller" />
        <Card className="border-rose-200 bg-rose-50 p-6 text-rose-800">
          <p>{reportsQuery.error.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
            Reintentar
          </Button>
        </Card>
      </div>
    )
  }

  if (reportsQuery.isLoading || !snapshot) {
    return (
      <div className="space-y-8">
        <PageHeader title="Reportes" description="Cargando panel de control..." />
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      </div>
    )
  }

  const COLORS = ['#6E2038', '#D4AF37', '#8A3450', '#C49B4C', '#B76E79', '#E5C687']

  const monthlyChartData = snapshot.monthly.map((point) => ({
    name: point.label,
    Facturado: point.revenue,
    Cobrado: point.collected,
    Pedidos: point.orders,
  }))

  const statusPieData = snapshot.statusBreakdown.map((point) => ({
    name: getStatusLabel(point.status),
    value: point.count,
    color: COLORS[snapshot.statusBreakdown.indexOf(point) % COLORS.length],
  }))

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Panel de control"
          description="Vision ejecutiva del taller: ventas, cobranza, demanda y operaciones."
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {snapshot.summary.map((metric, index) => {
          const Icon = METRIC_ICONS[index % METRIC_ICONS.length]
          return (
            <Card
              key={metric.title}
              className="flex flex-col justify-between border-atarah-gold-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-atarah-charcoal-600">{metric.title}</p>
                <div className="flex size-9 items-center justify-center rounded-xl bg-atarah-wine-50">
                  <Icon className="size-4 text-atarah-wine-700" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-atarah-wine-900">
                  {formatMetricValue(metric.title, metric.value)}
                </p>
                <p className="mt-1 text-xs text-atarah-charcoal-500">{metric.helper}</p>
                {metric.deltaValue !== null ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-atarah-gold-700">
                    {metric.deltaValue > 0 ? '+' : ''}
                    {metric.deltaValue}% {metric.deltaLabel}
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-atarah-gold-700">
                    {metric.deltaLabel}
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {snapshot.insights.map((insight) => {
          const tone = INSIGHT_TONE_CLASSES[insight.tone] || INSIGHT_TONE_CLASSES.charcoal
          return (
            <Card
              key={insight.title}
              className={`flex items-start gap-4 border-atarah-gold-200 p-5 shadow-sm ${tone.bg} ${tone.text}`}
            >
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone.iconBg}`}>
                <PackageSearch className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="mt-1 text-2xl font-bold">{insight.value}</p>
                <p className="mt-1 text-sm opacity-80">{insight.description}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="border-atarah-gold-200 p-6 shadow-sm">
          <h2 className="mb-4 font-display text-2xl font-bold text-atarah-wine-900">
            Tendencia mensual
          </h2>
          <p className="mb-6 text-sm text-atarah-charcoal-600">
            Ultimos 6 meses de facturacion, cobro y pedidos.
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} barGap={4}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4B5563' }} />
                <YAxis tick={{ fontSize: 12, fill: '#4B5563' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(normalizeTooltipValue(value))}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #D4AF37' }}
                />
                <Legend />
                <Bar dataKey="Facturado" fill="#6E2038" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Cobrado" fill="#D4AF37" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {snapshot.monthly.map((point) => (
              <div key={point.monthKey} className="rounded-xl bg-atarah-cream-50 p-3 text-center">
                <p className="text-xs font-semibold uppercase text-atarah-charcoal-500">{point.label}</p>
                <p className="mt-1 text-sm font-bold">{point.orders} pedidos</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-atarah-gold-200 p-6 shadow-sm">
          <h2 className="mb-4 font-display text-2xl font-bold text-atarah-wine-900">
            Pipeline por estado
          </h2>
          <p className="mb-6 text-sm text-atarah-charcoal-600">
            Volumen, facturacion y avance de cobranza por etapa.
          </p>
          <div className="mb-6 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${normalizeTooltipValue(value)} pedidos`}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #D4AF37' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {snapshot.statusBreakdown.map((point) => {
              const maxCount = Math.max(...snapshot.statusBreakdown.map((s) => s.count), 1)
              const barWidth = Math.max(8, (point.count / maxCount) * 100)
              return (
                <div key={point.status} className="rounded-xl bg-atarah-cream-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-atarah-charcoal-900">
                        {getStatusLabel(point.status)}
                      </p>
                      <p className="text-xs text-atarah-charcoal-600">{point.count} pedidos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-atarah-wine-900">
                        {formatCurrency(point.revenue)}
                      </p>
                      <p className="text-xs text-atarah-charcoal-600">
                        Cobrado {formatCurrency(point.collected)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white">
                    <div
                      className="h-1.5 rounded-full bg-atarah-wine-900"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-atarah-gold-700">
                    Ratio de cobro {getStatusCollectionWeight(point).toFixed(0)}%
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-atarah-gold-200 p-6 shadow-sm">
          <h2 className="mb-4 font-display text-2xl font-bold text-atarah-wine-900">
            Productos con mas ventas
          </h2>
          <p className="mb-6 text-sm text-atarah-charcoal-600">
            Referencias que generan mas ingresos y unidades.
          </p>
          {snapshot.products.length ? (
            <div className="space-y-3">
              {snapshot.products.map((product, index) => {
                const maxRevenue = Math.max(...snapshot.products.map((p) => p.revenue), 1)
                const barWidth = Math.max(8, (product.revenue / maxRevenue) * 100)
                return (
                  <div key={`${product.name}-${index}`} className="rounded-xl bg-atarah-cream-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-atarah-charcoal-900">
                            {product.name}
                          </span>
                          <span className="rounded-full bg-atarah-cream-200 px-2 py-0.5 text-xs font-medium text-atarah-charcoal-700">
                            {product.category}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-atarah-charcoal-600">
                          <span>{product.units} uds.</span>
                          <span>{product.ordersCount} pedidos</span>
                          <span className="font-medium text-atarah-wine-900">
                            {formatCurrency(product.revenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white">
                      <div
                        className="h-1.5 rounded-full bg-atarah-wine-900"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={PackageSearch}
              title="Sin datos de productos"
              description="No hay suficientes pedidos para mostrar este ranking."
            />
          )}
        </Card>

        <Card className="border-atarah-gold-200 p-6 shadow-sm">
          <h2 className="mb-4 font-display text-2xl font-bold text-atarah-wine-900">
            Categorias destacadas
          </h2>
          <p className="mb-6 text-sm text-atarah-charcoal-600">
            Ingresos y volumen por familia de producto.
          </p>
          <div className="space-y-3">
            {snapshot.categories.map((category) => {
              const maxRev = Math.max(...snapshot.categories.map((c) => c.revenue), 1)
              const barWidth = Math.max(8, (category.revenue / maxRev) * 100)
              return (
                <div key={category.category} className="rounded-xl bg-atarah-cream-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-atarah-charcoal-900">
                        {category.category}
                      </p>
                      <p className="text-xs text-atarah-charcoal-600">
                        {category.units} uds. | {category.ordersCount} movimientos
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-atarah-wine-900">
                      {formatCurrency(category.revenue)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white">
                    <div
                      className="h-1.5 rounded-full bg-atarah-gold-400"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-atarah-gold-200 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-atarah-wine-50 text-atarah-wine-700">
              <Shirt className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-atarah-wine-900">
                Modelos mas pedidos
              </h2>
              <p className="text-sm text-atarah-charcoal-600">
                Ranking por unidades y cantidad de pedidos, no solo por dinero.
              </p>
            </div>
          </div>
          {snapshot.models.length ? (
            <div className="space-y-3">
              {snapshot.models.map((model, index) => {
                const maxUnits = Math.max(...snapshot.models.map((entry) => entry.units), 1)
                const barWidth = Math.max(8, (model.units / maxUnits) * 100)
                return (
                  <div key={`${model.name}-${index}`} className="rounded-xl bg-atarah-cream-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-atarah-charcoal-900">
                            {model.name}
                          </span>
                          <span className="rounded-full bg-atarah-cream-200 px-2 py-0.5 text-xs font-medium text-atarah-charcoal-700">
                            {model.category}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-atarah-charcoal-600">
                          <span>{model.units} uds.</span>
                          <span>{model.ordersCount} pedidos</span>
                          <span className="font-medium text-atarah-wine-900">{formatCurrency(model.revenue)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white">
                      <div
                        className="h-1.5 rounded-full bg-atarah-wine-900"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Shirt}
              title="Sin datos de modelos"
              description="Todavia no hay suficientes pedidos para comparar modelos."
            />
          )}
        </Card>

        <Card className="border-atarah-gold-200 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-atarah-gold-100 text-atarah-wine-800">
              <Palette className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-atarah-wine-900">
                Colores mas pedidos
              </h2>
              <p className="text-sm text-atarah-charcoal-600">
                Que colores salen mas por volumen y frecuencia de pedidos.
              </p>
            </div>
          </div>
          {snapshot.colors.length ? (
            <div className="space-y-3">
              {snapshot.colors.map((color, index) => {
                const maxUnits = Math.max(...snapshot.colors.map((entry) => entry.units), 1)
                const barWidth = Math.max(8, (color.units / maxUnits) * 100)
                return (
                  <div key={`${color.colorName}-${index}`} className="rounded-xl bg-atarah-cream-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-atarah-charcoal-900">
                          {color.colorName}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-atarah-charcoal-600">
                          <span>{color.units} uds.</span>
                          <span>{color.ordersCount} pedidos</span>
                          <span className="font-medium text-atarah-wine-900">{formatCurrency(color.revenue)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white">
                      <div
                        className="h-1.5 rounded-full bg-atarah-gold-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Palette}
              title="Sin datos de colores"
              description="Todavia no hay suficientes pedidos para comparar colores."
            />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-atarah-gold-200 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-atarah-cream-100 text-atarah-wine-800">
              <Ruler className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-atarah-wine-900">
                Tallas de blusa mas pedidas
              </h2>
              <p className="text-sm text-atarah-charcoal-600">
                Ranking de tallas superiores por unidades y frecuencia.
              </p>
            </div>
          </div>
          {snapshot.blouseSizes.length ? (
            <div className="space-y-3">
              {snapshot.blouseSizes.map((size, index) => {
                const maxUnits = Math.max(...snapshot.blouseSizes.map((entry) => entry.units), 1)
                const barWidth = Math.max(8, (size.units / maxUnits) * 100)
                return (
                  <div key={`${size.size}-${index}`} className="rounded-xl bg-atarah-cream-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-atarah-charcoal-900">
                          {size.size}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-atarah-charcoal-600">
                          <span>{size.units} uds.</span>
                          <span>{size.ordersCount} pedidos</span>
                          <span className="font-medium text-atarah-wine-900">{formatCurrency(size.revenue)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white">
                      <div
                        className="h-1.5 rounded-full bg-atarah-charcoal-900"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Ruler}
              title="Sin datos de tallas de blusa"
              description="Todavia no hay suficientes pedidos para comparar tallas de blusa."
            />
          )}
        </Card>

        <Card className="border-atarah-gold-200 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-atarah-gold-100 text-atarah-wine-800">
              <Ruler className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-atarah-wine-900">
                Tallas de pantalon mas pedidas
              </h2>
              <p className="text-sm text-atarah-charcoal-600">
                Ranking de tallas inferiores por unidades y frecuencia.
              </p>
            </div>
          </div>
          {snapshot.pantsSizes.length ? (
            <div className="space-y-3">
              {snapshot.pantsSizes.map((size, index) => {
                const maxUnits = Math.max(...snapshot.pantsSizes.map((entry) => entry.units), 1)
                const barWidth = Math.max(8, (size.units / maxUnits) * 100)
                return (
                  <div key={`${size.size}-${index}`} className="rounded-xl bg-atarah-cream-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-atarah-charcoal-900">
                          {size.size}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-atarah-charcoal-600">
                          <span>{size.units} uds.</span>
                          <span>{size.ordersCount} pedidos</span>
                          <span className="font-medium text-atarah-wine-900">{formatCurrency(size.revenue)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white">
                      <div
                        className="h-1.5 rounded-full bg-atarah-gold-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Ruler}
              title="Sin datos de tallas de pantalon"
              description="Todavia no hay suficientes pedidos para comparar tallas de pantalon."
            />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-atarah-gold-200 p-6 shadow-sm">
          <h2 className="mb-4 font-display text-2xl font-bold text-atarah-wine-900">
            Clientes de mayor valor
          </h2>
          <p className="mb-6 text-sm text-atarah-charcoal-600">
            Quienes mas compran, cuanto han pagado y cuanto sigue pendiente.
          </p>
          <div className="space-y-3">
            {snapshot.customers.map((customer, index) => (
              <div key={customer.customerId} className="rounded-xl bg-atarah-cream-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-atarah-wine-900 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-atarah-charcoal-900">
                        {customer.name}
                      </p>
                      <p className="text-xs text-atarah-charcoal-600">
                        {customer.city ?? 'Sin ciudad'} &bull; {customer.ordersCount} pedidos
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-atarah-wine-900">
                    {formatCurrency(customer.revenue)}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white px-3 py-2">
                    <span className="text-atarah-charcoal-600">Pagado</span>
                    <p className="mt-0.5 font-medium">{formatCurrency(customer.paid)}</p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2">
                    <span className="text-atarah-charcoal-600">Pendiente</span>
                    <p className="mt-0.5 font-medium">{formatCurrency(customer.outstanding)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-atarah-gold-200 bg-gradient-to-br from-atarah-wine-900 to-atarah-wine-800 p-6 text-white shadow-sm">
          <h2 className="mb-4 font-display text-2xl font-bold">
            Lectura rapida para direccion
          </h2>
          <p className="mb-6 text-sm text-white/75">
            Si hoy tuvieras que decidir donde poner foco comercial y operativo, estas son las pistas mas utiles del negocio.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {snapshot.insights.map((insight) => (
              <div
                key={insight.title}
                className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-white/65">
                  {insight.title}
                </p>
                <p className="mt-2 text-2xl font-bold">{insight.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}




