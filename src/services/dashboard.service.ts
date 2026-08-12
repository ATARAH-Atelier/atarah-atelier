import { supabase } from '../lib/supabase'
import type { DashboardStats, RecentOrder } from '../types/dashboard'
import type { OrderRow } from '../types/database'

const pendingStatuses = ['pending', 'confirmed', 'waiting_for_payment']

interface DashboardScope {
  sellerProfileId?: string | null
}

async function countOrdersByStatuses(statuses: string[], scope?: DashboardScope) {
  let query = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('status', statuses)

  if (scope?.sellerProfileId) {
    query = query.eq('seller_profile_id', scope.sellerProfileId)
  }

  const { count, error } = await query

  if (error) {
    throw new Error('No fue posible consultar las estadísticas de pedidos.')
  }

  return count ?? 0
}

async function countOrdersByStatus(status: string, scope?: DashboardScope) {
  let query = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', status)

  if (scope?.sellerProfileId) {
    query = query.eq('seller_profile_id', scope.sellerProfileId)
  }

  const { count, error } = await query

  if (error) {
    throw new Error('No fue posible consultar las estadísticas de pedidos.')
  }

  return count ?? 0
}

export async function getDashboardStats(scope?: DashboardScope): Promise<DashboardStats> {
  const [pendingOrders, inProductionOrders, readyOrders, customersResult] =
    await Promise.all([
      countOrdersByStatuses(pendingStatuses, scope),
      countOrdersByStatus('in_production', scope),
      countOrdersByStatus('ready', scope),
      (async () => {
        let customersQuery = supabase
          .from('orders')
          .select('customer_id')
          .not('customer_id', 'is', null)

        if (scope?.sellerProfileId) {
          customersQuery = customersQuery.eq('seller_profile_id', scope.sellerProfileId)
        }

        return await customersQuery
      })(),
    ])

  if (customersResult.error) {
    throw new Error('No fue posible consultar el total de clientes.')
  }

  const customersCount = new Set(
    (customersResult.data ?? [])
      .map((row) => row.customer_id)
      .filter((customerId): customerId is string => Boolean(customerId)),
  ).size

  return {
    customersCount,
    inProductionOrders,
    pendingOrders,
    readyOrders,
  }
}

export async function getRecentOrders(scope?: DashboardScope): Promise<RecentOrder[]> {
  let query = supabase
    .from('orders')
    .select('id, order_number, status, total, created_at, customer_id')

  if (scope?.sellerProfileId) {
    query = query.eq('seller_profile_id', scope.sellerProfileId)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    throw new Error('No fue posible consultar los pedidos recientes.')
  }

  const orders = (data ?? []) as OrderRow[]

  if (!orders.length) {
    return []
  }

  const customerIds = orders
    .map((order) => order.customer_id)
    .filter((customerId): customerId is string => Boolean(customerId))

  let customersMap = new Map<string, string>()

  if (customerIds.length) {
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, full_name')
      .in('id', customerIds)

    if (customersError) {
      throw new Error('No fue posible consultar los clientes de los pedidos.')
    }

    customersMap = new Map(
      (customers ?? []).map((customer) => [customer.id, customer.full_name]),
    )
  }

  return orders.map((order) => ({
    created_at: order.created_at,
    customer_name: order.customer_id
      ? customersMap.get(order.customer_id) ?? null
      : null,
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total: order.total,
  }))
}
