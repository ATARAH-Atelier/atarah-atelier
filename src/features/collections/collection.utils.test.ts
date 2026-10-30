import { describe, expect, it } from 'vitest'

import { buildWhatsAppUrl, getCollectionStageLabel, getPromiseStatus } from './collection.utils'
import { paymentPromiseSchema, validatePaymentPromiseDate } from './schemas/payment-promise.schema'

describe('buildWhatsAppUrl', () => {
  it('normalizes the phone and encodes the message', () => {
    expect(buildWhatsAppUrl('+58 (412) 123-4567', 'Hola Maria & equipo')).toBe(
      'https://wa.me/584121234567?text=Hola%20Maria%20%26%20equipo',
    )
  })
})

describe('collection stages', () => {
  it('uses a readable label for a manual follow up', () => {
    expect(getCollectionStageLabel('manual_followup')).toBe('Contacto personal')
  })
})

describe('payment promises', () => {
  it('requires a positive amount', () => {
    expect(paymentPromiseSchema.safeParse({ amount: 0, notes: '', promisedDate: '2030-01-01' }).success).toBe(false)
  })

  it('identifies a pending promise in the past as broken', () => {
    expect(getPromiseStatus({
      amount: 10,
      cancelled_at: null,
      created_at: '2026-01-01T00:00:00Z',
      created_by_profile_id: null,
      customer_id: 'customer',
      fulfilled_at: null,
      id: 'promise',
      notes: null,
      order_id: 'order',
      promised_date: '2020-01-01',
      status: 'pending',
    })).toBe('broken')
  })

  it('rejects a date before today', () => {
    expect(validatePaymentPromiseDate('2020-01-01')).toBe(false)
  })
})
