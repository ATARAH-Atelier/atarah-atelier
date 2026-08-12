import { supabase } from '../lib/supabase'
import { normalizeNumber } from '../lib/utils'
import type { AppliedDiscount, DiscountCode, DiscountCodeInput, DiscountCodeRow } from '../types/database'

function mapDiscount(row: DiscountCodeRow): DiscountCode {
  return {
    ...row,
    is_active: Boolean(row.is_active),
    min_order_amount: normalizeNumber(row.min_order_amount),
    value: normalizeNumber(row.value),
  }
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

function isDateActive(startsAt: string | null, endsAt: string | null) {
  const now = Date.now()

  if (startsAt && new Date(startsAt).getTime() > now) {
    return false
  }

  if (endsAt && new Date(endsAt).getTime() < now) {
    return false
  }

  return true
}

function translateDiscountError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? ''

  if (message.includes('discount_codes') || message.includes('relation')) {
    return 'Debes aplicar la migración de descuentos en Supabase.'
  }

  if (message.includes('duplicate') || message.includes('unique')) {
    return 'Ya existe un descuento con ese código.'
  }

  return 'No fue posible guardar el descuento.'
}

export function applyDiscountToSubtotal(discount: DiscountCode, subtotal: number): AppliedDiscount {
  const eligibleSubtotal = Math.max(0, subtotal)
  const rawDiscount = discount.type === 'percentage'
    ? eligibleSubtotal * (discount.value / 100)
    : discount.value
  const discountAmount = Math.min(eligibleSubtotal, Math.max(0, rawDiscount))

  return {
    code: discount.code,
    discount_amount: Number(discountAmount.toFixed(2)),
    discount_code_id: discount.id,
    final_total: Number(Math.max(0, eligibleSubtotal - discountAmount).toFixed(2)),
    subtotal: Number(eligibleSubtotal.toFixed(2)),
  }
}

export async function getAdminDiscountCodes() {
  const { data, error } = await supabase
    .from('discount_codes')
    .select('id, code, description, type, value, min_order_amount, usage_limit, uses_count, starts_at, ends_at, is_active, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(translateDiscountError(error))
  }

  return (data ?? []).map((row) => mapDiscount(row as DiscountCodeRow))
}

export async function createDiscountCode(input: DiscountCodeInput) {
  const payload = {
    code: normalizeCode(input.code),
    description: input.description?.trim() || null,
    ends_at: input.ends_at,
    is_active: input.is_active,
    min_order_amount: input.min_order_amount,
    starts_at: input.starts_at,
    type: input.type,
    usage_limit: input.usage_limit,
    value: input.value,
  }

  const { data, error } = await supabase
    .from('discount_codes')
    .insert(payload)
    .select('id, code, description, type, value, min_order_amount, usage_limit, uses_count, starts_at, ends_at, is_active, created_at, updated_at')
    .maybeSingle()

  if (error || !data) {
    throw new Error(translateDiscountError(error))
  }

  return mapDiscount(data as DiscountCodeRow)
}

export async function updateDiscountCode(id: string, input: DiscountCodeInput) {
  const payload = {
    code: normalizeCode(input.code),
    description: input.description?.trim() || null,
    ends_at: input.ends_at,
    is_active: input.is_active,
    min_order_amount: input.min_order_amount,
    starts_at: input.starts_at,
    type: input.type,
    updated_at: new Date().toISOString(),
    usage_limit: input.usage_limit,
    value: input.value,
  }

  const { data, error } = await supabase
    .from('discount_codes')
    .update(payload)
    .eq('id', id)
    .select('id, code, description, type, value, min_order_amount, usage_limit, uses_count, starts_at, ends_at, is_active, created_at, updated_at')
    .maybeSingle()

  if (error || !data) {
    throw new Error(translateDiscountError(error))
  }

  return mapDiscount(data as DiscountCodeRow)
}

export async function setDiscountCodeActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from('discount_codes')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(translateDiscountError(error))
  }
}

export async function validateDiscountCode(code: string, subtotal: number) {
  const normalizedCode = normalizeCode(code)

  if (!normalizedCode) {
    throw new Error('Ingresa un código de descuento.')
  }

  const { data, error } = await supabase
    .from('discount_codes')
    .select('id, code, description, type, value, min_order_amount, usage_limit, uses_count, starts_at, ends_at, is_active, created_at, updated_at')
    .eq('code', normalizedCode)
    .maybeSingle()

  if (error) {
    throw new Error(translateDiscountError(error))
  }

  if (!data) {
    throw new Error('Ese código no existe.')
  }

  const discount = mapDiscount(data as DiscountCodeRow)

  if (!discount.is_active) {
    throw new Error('Ese código de descuento está inactivo.')
  }

  if (!isDateActive(discount.starts_at, discount.ends_at)) {
    throw new Error('Ese código no está vigente en este momento.')
  }

  if (discount.usage_limit !== null && (discount.uses_count ?? 0) >= discount.usage_limit) {
    throw new Error('Ese código ya alcanzó su límite de uso.')
  }

  if (subtotal < discount.min_order_amount) {
    throw new Error(`Este código requiere un subtotal mínimo de ${discount.min_order_amount.toFixed(2)} USD.`)
  }

  return {
    applied: applyDiscountToSubtotal(discount, subtotal),
    discount,
  }
}
