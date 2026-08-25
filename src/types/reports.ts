export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'waiting_for_payment'
  | 'in_production'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export interface ReportMetric {
  deltaLabel: string
  deltaValue: number | null
  helper: string
  title: string
  value: number
}

export interface ReportsMonthlyPoint {
  collected: number
  label: string
  monthKey: string
  orders: number
  revenue: number
}

export interface ReportsStatusPoint {
  collected: number
  count: number
  revenue: number
  status: OrderStatus
}

export interface ReportsProductPoint {
  category: string
  name: string
  ordersCount: number
  revenue: number
  units: number
}

export interface ReportsModelPoint {
  category: string
  name: string
  ordersCount: number
  revenue: number
  units: number
}

export interface ReportsColorPoint {
  colorName: string
  ordersCount: number
  revenue: number
  units: number
}

export interface ReportsCategoryPoint {
  category: string
  ordersCount: number
  revenue: number
  units: number
}

export interface ReportsCustomerPoint {
  city: string | null
  customerId: string
  name: string
  ordersCount: number
  outstanding: number
  paid: number
  revenue: number
}

export interface ReportsDebtorOrderItem {
  productName: string
  quantity: number
}

export interface ReportsDebtorOrder {
  balance: number
  createdAt: string | null
  items: ReportsDebtorOrderItem[]
  orderId: string
  orderNumber: string
  status: OrderStatus
  total: number
}

export interface ReportsDebtorPoint {
  address: string | null
  city: string | null
  customerId: string
  email: string | null
  name: string
  orders: ReportsDebtorOrder[]
  outstanding: number
  phone: string | null
  state: string | null
}

export interface ReportsInsight {
  description: string
  title: string
  tone: 'wine' | 'gold' | 'charcoal'
  value: string
}

export interface ReportsSnapshot {
  categories: ReportsCategoryPoint[]
  colors: ReportsColorPoint[]
  customers: ReportsCustomerPoint[]
  debtors: ReportsDebtorPoint[]
  insights: ReportsInsight[]
  models: ReportsModelPoint[]
  monthly: ReportsMonthlyPoint[]
  products: ReportsProductPoint[]
  statusBreakdown: ReportsStatusPoint[]
  summary: ReportMetric[]
}
