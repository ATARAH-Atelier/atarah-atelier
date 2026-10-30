import { normalizeNumber } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type {
  CollectionQueueItem,
  CollectionReminderStage,
  CollectionReminderStatus,
  CreatePaymentPromiseInput,
  PaymentPromise,
} from '../types/collection'

interface ReminderRow {
  balance_snapshot: number | string
  created_at: string
  customer_id: string
  days_overdue: number
  id: string
  message: string | null
  opened_at: string | null
  order_id: string
  priority: number
  sent_at: string | null
  sent_by_profile_id: string | null
  stage: CollectionReminderStage
  status: CollectionReminderStatus
}

interface OrderRow {
  balance: number | string | null
  customer_id: string | null
  id: string
  order_number: string
  payment_due_date?: string | null
}

interface CustomerRow {
  full_name: string
  id: string
  phone: string | null
}

interface ProfileRow {
  full_name: string | null
  id: string
}

function mapPaymentPromise(row: {
  amount: number | string
  cancelled_at: string | null
  created_at: string
  created_by_profile_id: string | null
  customer_id: string
  fulfilled_at: string | null
  id: string
  notes: string | null
  order_id: string
  promised_date: string
  status: PaymentPromise['status']
}): PaymentPromise {
  return {
    ...row,
    amount: normalizeNumber(row.amount),
  }
}

export const collectionKeys = {
  all: ['collections'] as const,
  history: (orderId: string) => [...collectionKeys.all, 'history', orderId] as const,
  promises: (orderId?: string) => [...collectionKeys.all, 'promises', orderId ?? 'all'] as const,
  queue: () => [...collectionKeys.all, 'queue'] as const,
}

export async function getCollectionQueue(): Promise<CollectionQueueItem[]> {
  const { data: remindersData, error: remindersError } = await supabase
    .from('collection_reminders')
    .select('id, order_id, customer_id, stage, priority, balance_snapshot, days_overdue, message, status, opened_at, sent_at, sent_by_profile_id, created_at')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (remindersError) {
    throw new Error('No fue posible cargar la cola de cobranza.')
  }

  const reminders = (remindersData ?? []) as ReminderRow[]
  if (!reminders.length) {
    return []
  }

  const orderIds = Array.from(new Set(reminders.map((reminder) => reminder.order_id)))
  const customerIds = Array.from(new Set(reminders.map((reminder) => reminder.customer_id)))
  const profileIds = Array.from(new Set(reminders.map((reminder) => reminder.sent_by_profile_id).filter(Boolean))) as string[]

  const [ordersResult, customersResult, profilesResult] = await Promise.all([
    supabase.from('orders').select('id, order_number, customer_id, balance, payment_due_date').in('id', orderIds),
    supabase.from('customers').select('id, full_name, phone').in('id', customerIds),
    profileIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (ordersResult.error || customersResult.error || profilesResult.error) {
    throw new Error('No fue posible completar los datos de cobranza.')
  }

  const orders = new Map((ordersResult.data ?? []).map((order) => [order.id, order as OrderRow]))
  const customers = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer as CustomerRow]))
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile as ProfileRow]))

  return reminders.flatMap((reminder) => {
    const order = orders.get(reminder.order_id)
    const customer = customers.get(reminder.customer_id)
    if (!order || !customer || normalizeNumber(order.balance) <= 0) {
      return []
    }

    return [{
      balance: normalizeNumber(order.balance),
      balanceSnapshot: normalizeNumber(reminder.balance_snapshot),
      customerId: reminder.customer_id,
      customerName: customer.full_name,
      daysOverdue: reminder.days_overdue,
      dueDate: order.payment_due_date ?? null,
      message: reminder.message,
      openedAt: reminder.opened_at,
      orderId: reminder.order_id,
      orderNumber: order.order_number,
      phone: customer.phone,
      priority: reminder.priority,
      reminderId: reminder.id,
      sentAt: reminder.sent_at,
      sentByName: reminder.sent_by_profile_id ? profiles.get(reminder.sent_by_profile_id)?.full_name ?? null : null,
      stage: reminder.stage,
      status: reminder.status,
    }]
  })
}

export async function getPaymentPromises(orderId?: string): Promise<PaymentPromise[]> {
  let query = supabase
    .from('payment_promises')
    .select('id, order_id, customer_id, amount, promised_date, notes, status, created_by_profile_id, created_at, fulfilled_at, cancelled_at')
    .order('promised_date', { ascending: true })

  if (orderId) {
    query = query.eq('order_id', orderId)
  }

  const { data, error } = await query
  if (error) {
    throw new Error('No fue posible cargar las promesas de pago.')
  }

  return (data ?? []).map((row) => mapPaymentPromise(row as Parameters<typeof mapPaymentPromise>[0]))
}

export async function updateCollectionReminderStatus(
  reminderId: string,
  status: Extract<CollectionReminderStatus, 'opened' | 'sent' | 'skipped'>,
) {
  const now = new Date().toISOString()
  const payload = status === 'opened'
    ? { opened_at: now, status }
    : status === 'sent'
      ? { sent_at: now, sent_by_profile_id: (await supabase.auth.getUser()).data.user?.id ?? null, status }
      : { skipped_at: now, status }

  const { error } = await supabase.from('collection_reminders').update(payload).eq('id', reminderId)
  if (error) {
    throw new Error('No fue posible actualizar el recordatorio.')
  }
}

export async function createPaymentPromise(input: CreatePaymentPromiseInput) {
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase.from('payment_promises').insert({
    amount: input.amount,
    created_by_profile_id: userData.user?.id ?? null,
    customer_id: input.customerId,
    notes: input.notes,
    order_id: input.orderId,
    promised_date: input.promisedDate,
  })

  if (error) {
    throw new Error('No fue posible registrar la promesa de pago.')
  }
}

export async function cancelPaymentPromise(promiseId: string) {
  const { error } = await supabase
    .from('payment_promises')
    .update({ cancelled_at: new Date().toISOString(), status: 'cancelled' })
    .eq('id', promiseId)

  if (error) {
    throw new Error('No fue posible cancelar la promesa de pago.')
  }
}
