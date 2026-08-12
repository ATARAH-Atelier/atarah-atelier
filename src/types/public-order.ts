import type { OrderStatus } from './database'

export interface PublicOrderItem {
  blouse_size: string | null
  color_hex: string | null
  color_name: string | null
  line_total: number
  notes: string | null
  pants_size: string | null
  product_name_snapshot: string
  quantity: number
  unit_price: number
}

export interface OrderTimelineEntry {
  created_at: string | null
  status: OrderStatus
}

export interface PublicOrderStatus {
  balance: number
  created_at: string
  delivery_method: string | null
  items: PublicOrderItem[]
  order_number: string
  paid_amount: number
  requested_date: string | null
  status: OrderStatus
  timeline: OrderTimelineEntry[]
  total: number
  updated_at: string | null
}
