import { supabase } from '../lib/supabase'
import { normalizeNumber, translateOrderStatus } from '../lib/utils'
import type { OrderStatus } from '../types/database'
import type {
  ReportMetric,
  ReportsCategoryPoint,
  ReportsCustomerPoint,
  ReportsDebtorPoint,
  ReportsInsight,
  ReportsMonthlyPoint,
  ReportsProductPoint,
  ReportsSnapshot,
  ReportsStatusPoint,
} from '../types/reports'

interface OrderReportRow {
  balance?: number | string | null
  created_at: string | null
  customer_id: string | null
  delivery_method?: string | null
  id: string
  order_number?: string | null
  paid_amount?: number | string | null
  requested_date?: string | null
  status: OrderStatus
  total?: number | string | null
}

interface OrderItemReportRow {
  line_total?: number | string | null
  order_id: string
  product_id?: string | null
  product_name?: string | null
  product_name_snapshot?: string | null
  quantity?: number | null
  subtotal?: number | string | null
  total?: number | string | null
}

interface CustomerReportRow {
  address?: string | null
  city?: string | null
  email?: string | null
  full_name?: string | null
  id: string
  phone?: string | null
  state?: string | null
}

interface ProductReportRow {
  category?: string | null
  id: string
  name?: string | null
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'waiting_for_payment', 'in_production', 'ready']

function formatDelta(value: number) {
  if (!Number.isFinite(value)) {
    return null
  }

  return Number(value.toFixed(1))
}

function monthKeyFromDate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

function monthLabelFromDate(date: Date) {
  return new Intl.DateTimeFormat('es-VE', { month: 'short' }).format(date)
}

function getTrailingMonths(count: number) {
  const now = new Date()
  const months: Array<{ date: Date; key: string; label: string }> = []

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    months.push({ date, key: monthKeyFromDate(date), label: monthLabelFromDate(date) })
  }

  return months
}

function buildMetric(title: string, value: number, helper: string, deltaValue: number | null, deltaLabel: string): ReportMetric {
  return {
    deltaLabel,
    deltaValue,
    helper,
    title,
    value,
  }
}

export async function getReportsSnapshot(): Promise<ReportsSnapshot> {
  const [{ data: ordersData, error: ordersError }, { data: itemsData, error: itemsError }, { data: customersData, error: customersError }, { data: productsData, error: productsError }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, customer_id, status, total, paid_amount, balance, created_at, requested_date, delivery_method'),
    supabase
      .from('order_items')
      .select('order_id, product_id, quantity, line_total, total, subtotal, product_name, product_name_snapshot'),
    supabase
      .from('customers')
      .select('id, full_name, city, phone, email, state, address'),
    supabase
      .from('products')
      .select('id, name, category'),
  ])

  if (ordersError) {
    throw new Error('No fue posible construir los reportes porque fallo la lectura de pedidos.')
  }

  if (itemsError) {
    throw new Error('No fue posible construir los reportes porque fallo la lectura de order_items.')
  }

  if (customersError) {
    throw new Error('No fue posible construir los reportes porque fallo la lectura de clientes.')
  }

  if (productsError) {
    throw new Error('No fue posible construir los reportes porque fallo la lectura de productos.')
  }

  const orders = (ordersData ?? []) as OrderReportRow[]
  const orderItems = (itemsData ?? []) as OrderItemReportRow[]
  const customers = (customersData ?? []) as CustomerReportRow[]
  const products = (productsData ?? []) as ProductReportRow[]

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]))
  const productMap = new Map(products.map((product) => [product.id, product]))
  const orderMap = new Map(orders.map((order) => [order.id, order]))
  const orderItemsByOrderId = new Map<string, Array<{ productName: string; quantity: number }>>()

  const totalRevenue = orders.reduce((sum, order) => sum + normalizeNumber(order.total), 0)
  const totalCollected = orders.reduce((sum, order) => sum + normalizeNumber(order.paid_amount), 0)
  const totalOutstanding = orders.reduce((sum, order) => sum + normalizeNumber(order.balance), 0)
  const totalOrders = orders.length
  const activeCustomers = new Set(orders.map((order) => order.customer_id).filter(Boolean)).size
  const deliveredOrders = orders.filter((order) => order.status === 'delivered').length
  const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0

  const trailingMonths = getTrailingMonths(6)
  const previousMonthKey = trailingMonths.at(-2)?.key ?? null
  const currentMonthKey = trailingMonths.at(-1)?.key ?? null
  const monthlyMap = new Map<string, ReportsMonthlyPoint>(
    trailingMonths.map((month) => [
      month.key,
      { collected: 0, label: month.label, monthKey: month.key, orders: 0, revenue: 0 },
    ]),
  )

  const statusMap = new Map<OrderStatus, ReportsStatusPoint>()

  for (const order of orders) {
    const createdAt = order.created_at ? new Date(order.created_at) : null
    const revenue = normalizeNumber(order.total)
    const collected = normalizeNumber(order.paid_amount)
    const monthKey = createdAt ? monthKeyFromDate(createdAt) : null

    if (monthKey && monthlyMap.has(monthKey)) {
      const month = monthlyMap.get(monthKey) as ReportsMonthlyPoint
      month.orders += 1
      month.revenue += revenue
      month.collected += collected
    }

    const currentStatus = statusMap.get(order.status) ?? {
      collected: 0,
      count: 0,
      revenue: 0,
      status: order.status,
    }

    currentStatus.count += 1
    currentStatus.revenue += revenue
    currentStatus.collected += collected
    statusMap.set(order.status, currentStatus)
  }

  const productAccumulator = new Map<string, ReportsProductPoint>()
  const categoryAccumulator = new Map<string, ReportsCategoryPoint>()
  const customerAccumulator = new Map<string, ReportsCustomerPoint>()

  for (const item of orderItems) {
    const order = orderMap.get(item.order_id)
    if (!order) {
      continue
    }

    const quantity = item.quantity ?? 0
    const revenue = normalizeNumber(item.line_total ?? item.total ?? item.subtotal)
    const product = item.product_id ? productMap.get(item.product_id) : null
    const productName = item.product_name_snapshot ?? item.product_name ?? product?.name ?? 'Producto sin nombre'
    const category = product?.category?.trim() || 'Sin categoria'
    const productKey = item.product_id ?? productName

    const currentProduct = productAccumulator.get(productKey) ?? {
      category,
      name: productName,
      ordersCount: 0,
      revenue: 0,
      units: 0,
    }
    currentProduct.ordersCount += 1
    currentProduct.revenue += revenue
    currentProduct.units += quantity
    productAccumulator.set(productKey, currentProduct)

    const currentCategory = categoryAccumulator.get(category) ?? {
      category,
      ordersCount: 0,
      revenue: 0,
      units: 0,
    }
    currentCategory.ordersCount += 1
    currentCategory.revenue += revenue
    currentCategory.units += quantity
    categoryAccumulator.set(category, currentCategory)

    const orderItemsList = orderItemsByOrderId.get(item.order_id) ?? []
    orderItemsList.push({ productName, quantity })
    orderItemsByOrderId.set(item.order_id, orderItemsList)

    if (order.customer_id) {
      const customer = customerMap.get(order.customer_id)
      const currentCustomer = customerAccumulator.get(order.customer_id) ?? {
        city: customer?.city ?? null,
        customerId: order.customer_id,
        name: customer?.full_name?.trim() || 'Cliente sin nombre',
        ordersCount: 0,
        outstanding: 0,
        paid: 0,
        revenue: 0,
      }
      currentCustomer.revenue += revenue
      customerAccumulator.set(order.customer_id, currentCustomer)
    }
  }

  for (const order of orders) {
    if (!order.customer_id) {
      continue
    }

    const customer = customerMap.get(order.customer_id)
    const currentCustomer = customerAccumulator.get(order.customer_id) ?? {
      city: customer?.city ?? null,
      customerId: order.customer_id,
      name: customer?.full_name?.trim() || 'Cliente sin nombre',
      ordersCount: 0,
      outstanding: 0,
      paid: 0,
      revenue: 0,
    }

    currentCustomer.ordersCount += 1
    currentCustomer.paid += normalizeNumber(order.paid_amount)
    currentCustomer.outstanding += normalizeNumber(order.balance)
    if (!currentCustomer.revenue) {
      currentCustomer.revenue += normalizeNumber(order.total)
    }
    customerAccumulator.set(order.customer_id, currentCustomer)
  }

  const currentMonth = currentMonthKey ? monthlyMap.get(currentMonthKey) : null
  const previousMonth = previousMonthKey ? monthlyMap.get(previousMonthKey) : null
  const currentMonthRevenue = currentMonth?.revenue ?? 0
  const previousMonthRevenue = previousMonth?.revenue ?? 0
  const currentMonthOrders = currentMonth?.orders ?? 0
  const previousMonthOrders = previousMonth?.orders ?? 0
  const revenueDelta = previousMonthRevenue ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : null
  const ordersDelta = previousMonthOrders ? ((currentMonthOrders - previousMonthOrders) / previousMonthOrders) * 100 : null
  const collectionRate = totalRevenue ? (totalCollected / totalRevenue) * 100 : 0
  const completionRate = totalOrders ? (deliveredOrders / totalOrders) * 100 : 0

  const summary: ReportMetric[] = [
    buildMetric('Facturacion estimada', totalRevenue, 'Suma total de pedidos registrados.', formatDelta(revenueDelta ?? Number.NaN), 'vs mes anterior'),
    buildMetric('Cobrado acumulado', totalCollected, `${collectionRate.toFixed(1)}% del total ya fue cobrado.`, null, 'ratio de cobro'),
    buildMetric('Saldo por cobrar', totalOutstanding, 'Monto aun pendiente de pago.', null, 'seguimiento financiero'),
    buildMetric('Ticket promedio', averageOrderValue, 'Valor promedio por pedido.', formatDelta(ordersDelta ?? Number.NaN), 'variacion de pedidos'),
    buildMetric('Clientes activos', activeCustomers, 'Clientes con al menos un pedido.', null, 'base activa'),
    buildMetric('Pedidos entregados', deliveredOrders, `${completionRate.toFixed(1)}% del historico completo.`, null, 'cumplimiento'),
  ]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdueOrders = orders.filter((order) => {
    if (!order.requested_date || !ACTIVE_STATUSES.includes(order.status)) {
      return false
    }
    const requestedDate = new Date(order.requested_date)
    requestedDate.setHours(0, 0, 0, 0)
    return requestedDate < today
  }).length

  const dueThisWeek = orders.filter((order) => {
    if (!order.requested_date || !ACTIVE_STATUSES.includes(order.status)) {
      return false
    }
    const requestedDate = new Date(order.requested_date)
    const diffDays = (requestedDate.getTime() - today.getTime()) / 86400000
    return diffDays >= 0 && diffDays <= 7
  }).length

  const waitingPaymentOrders = orders.filter((order) =>
    order.status === 'waiting_for_payment' || normalizeNumber(order.balance) > 0,
  ).length

  const readyToDeliver = orders.filter((order) => order.status === 'ready').length
  const strongestCategory = Array.from(categoryAccumulator.values()).sort((first, second) => second.revenue - first.revenue)[0]
  const topCustomer = Array.from(customerAccumulator.values()).sort((first, second) => second.revenue - first.revenue)[0]

  const insights: ReportsInsight[] = [
    {
      description: 'Pedidos con fecha solicitada vencida y aun activos.',
      title: 'Pedidos vencidos',
      tone: 'wine',
      value: `${overdueOrders}`,
    },
    {
      description: 'Ordenes que deben resolverse en los proximos 7 dias.',
      title: 'Ventana semanal',
      tone: 'gold',
      value: `${dueThisWeek}`,
    },
    {
      description: 'Pedidos con saldo pendiente o esperando validacion de pago.',
      title: 'Pendientes por cobro',
      tone: 'charcoal',
      value: `${waitingPaymentOrders}`,
    },
    {
      description: strongestCategory
        ? `La categoria mas rentable es ${strongestCategory.category}.`
        : 'Aun no hay una categoria dominante.',
      title: 'Categoria lider',
      tone: 'gold',
      value: strongestCategory ? `${strongestCategory.category}` : 'Sin datos',
    },
    {
      description: topCustomer
        ? `${topCustomer.name} es el cliente con mayor facturacion acumulada.`
        : 'Aun no hay clientes suficientes para comparar.',
      title: 'Cliente de mayor valor',
      tone: 'wine',
      value: topCustomer ? topCustomer.name : 'Sin datos',
    },
    {
      description: 'Pedidos listos para entrega o despacho inmediato.',
      title: 'Listos para salir',
      tone: 'charcoal',
      value: `${readyToDeliver}`,
    },
  ]

  const monthly = Array.from(monthlyMap.values())
  const statusBreakdown = Array.from(statusMap.values()).sort((first, second) => second.count - first.count)
  const productsList = Array.from(productAccumulator.values()).sort((first, second) => second.revenue - first.revenue).slice(0, 8)
  const categories = Array.from(categoryAccumulator.values()).sort((first, second) => second.revenue - first.revenue)
  const customersList = Array.from(customerAccumulator.values()).sort((first, second) => second.revenue - first.revenue).slice(0, 8)

  const debtorsByCustomer = orders
    .filter((order) => order.customer_id && normalizeNumber(order.balance) > 0)
    .reduce<Map<string, ReportsDebtorPoint>>((accumulator, order) => {
      const customerId = order.customer_id as string
      const customer = customerMap.get(customerId)
      const current = accumulator.get(customerId) ?? {
        address: customer?.address ?? null,
        city: customer?.city ?? null,
        customerId,
        email: customer?.email ?? null,
        name: customer?.full_name?.trim() || 'Cliente sin nombre',
        orders: [],
        outstanding: 0,
        phone: customer?.phone ?? null,
        state: customer?.state ?? null,
      }

      current.outstanding += normalizeNumber(order.balance)
      current.orders.push({
        balance: normalizeNumber(order.balance),
        createdAt: order.created_at,
        items: orderItemsByOrderId.get(order.id) ?? [],
        orderId: order.id,
        orderNumber: order.order_number ?? 'Sin numero',
        status: order.status,
        total: normalizeNumber(order.total),
      })
      accumulator.set(customerId, current)
      return accumulator
    }, new Map())

  const debtorsList = Array.from(debtorsByCustomer.values())
    .map((debtor) => ({
      ...debtor,
      orders: debtor.orders.sort((first, second) => new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime()),
    }))
    .sort((first, second) => second.outstanding - first.outstanding)

  return {
    categories,
    customers: customersList,
    debtors: debtorsList,
    insights,
    monthly,
    products: productsList,
    statusBreakdown,
    summary,
  }
}

export function getStatusLabel(status: OrderStatus) {
  return translateOrderStatus(status)
}

export function getStatusCollectionWeight(point: ReportsStatusPoint) {
  return point.revenue ? (point.collected / point.revenue) * 100 : 0
}
