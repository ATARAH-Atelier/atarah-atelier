import type { CollectionReminderStage, PaymentPromise, PaymentPromiseStatus } from '../../types/collection'

export function buildWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = phone.replace(/[^0-9]/g, '')
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
}

export function getCollectionStageLabel(stage: CollectionReminderStage) {
  const labels: Record<CollectionReminderStage, string> = {
    due_soon: 'Por vencer',
    due_today: 'Vence hoy',
    manual_followup: 'Contacto personal',
    overdue_3: 'Vencido 3 dias',
    overdue_7: 'Vencido 7 dias',
  }

  return labels[stage]
}

export function getPromiseStatus(promise: PaymentPromise): PaymentPromiseStatus {
  if (promise.status !== 'pending') {
    return promise.status
  }

  return promise.promised_date < new Date().toISOString().slice(0, 10) ? 'broken' : 'pending'
}
