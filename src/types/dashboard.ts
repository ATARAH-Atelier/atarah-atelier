import type { OrderStatus } from './database'

export interface DashboardStats {
  customersCount: number
  inProductionOrders: number
  pendingOrders: number
  readyOrders: number
}

export interface RecentOrder {
  created_at: string | null
  customer_name: string | null
  id: string
  order_number: string
  status: OrderStatus
  total: number | string | null
}
