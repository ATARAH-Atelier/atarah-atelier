export type CollectionReminderStage =
  | 'due_soon'
  | 'due_today'
  | 'overdue_3'
  | 'overdue_7'
  | 'manual_followup'

export type CollectionReminderStatus = 'pending' | 'opened' | 'sent' | 'skipped' | 'cancelled'
export type PaymentPromiseStatus = 'pending' | 'fulfilled' | 'broken' | 'cancelled'

export interface PaymentPromise {
  amount: number
  cancelled_at: string | null
  created_at: string
  created_by_profile_id: string | null
  customer_id: string
  fulfilled_at: string | null
  id: string
  notes: string | null
  order_id: string
  promised_date: string
  status: PaymentPromiseStatus
}

export interface CollectionQueueItem {
  balance: number
  balanceSnapshot: number
  customerId: string
  customerName: string
  daysOverdue: number
  dueDate: string | null
  message: string | null
  openedAt: string | null
  orderId: string
  orderNumber: string
  phone: string | null
  priority: number
  reminderId: string
  sentAt: string | null
  sentByName: string | null
  stage: CollectionReminderStage
  status: CollectionReminderStatus
}

export interface CreatePaymentPromiseInput {
  amount: number
  customerId: string
  notes: string | null
  orderId: string
  promisedDate: string
}
