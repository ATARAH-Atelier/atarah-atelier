import { v4 as uuidv4 } from 'uuid'

import { normalizePhone } from '../lib/public-utils'
import { normalizeNumber } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type { CartItem } from '../types/cart'
import type {
  CheckoutFormValues,
  CheckoutSession,
  CreateGuestOrderInput,
  CreateGuestOrderResult,
} from '../types/checkout'

const CHECKOUT_SESSION_KEY = 'atarah_checkout_session_v1'

function translateCheckoutError(message: string) {
  const safeMessage = message.trim()
  const normalized = safeMessage.toLowerCase()

  if (normalized.includes('inactive')) {
    return 'Uno de los productos ya no está disponible.'
  }

  if (normalized.includes('invalid top size')) {
    return `Error de talla superior: ${safeMessage}`
  }

  if (normalized.includes('invalid bottom size')) {
    return `Error de talla inferior: ${safeMessage}`
  }

  if (normalized.includes('invalid size') || normalized.includes('size')) {
    return `Error de talla: ${safeMessage}`
  }

  if (normalized.includes('invalid color') || normalized.includes('color')) {
    return `Error de color: ${safeMessage}`
  }

  if (normalized.includes('invalid phone') || normalized.endsWith('phone')) {
    return 'El teléfono debe tener 11 dígitos válidos.'
  }

  if (normalized.includes('discount')) {
    return safeMessage || 'No fue posible aplicar el descuento al pedido.'
  }

  if (normalized.includes('invalid items') || normalized.includes('invalid quantity')) {
    return 'Hay un problema con los productos del carrito o sus cantidades.'
  }

  if (normalized.includes('row-level security') || normalized.includes('permission')) {
    return 'Supabase bloqueó la creación del pedido por permisos o RLS.'
  }

  return safeMessage
    ? `No fue posible crear el pedido: ${safeMessage}`
    : 'No fue posible crear el pedido. Intenta nuevamente.'
}

export function createCheckoutToken() {
  return uuidv4()
}

export function buildGuestOrderInput(
  values: CheckoutFormValues,
  items: CartItem[],
  checkoutToken: string,
  customerAuthUserId: string | null = null,
): CreateGuestOrderInput {
  return {
    checkout_token: checkoutToken,
    customer: {
      address: values.address.trim(),
      city: values.city.trim(),
      email: values.email.trim() || null,
      full_name: values.full_name.trim(),
      phone: normalizePhone(values.phone),
      state: values.state.trim() || null,
    },
    customer_auth_user_id: customerAuthUserId,
    delivery_method: values.delivery_method,
    discount_code: values.discount_code.trim() || null,
    items: items.map((item) => ({
      notes: item.customerNotes.trim() || null,
      product_id: item.productId,
      quantity: item.quantity,
      selected_bottom_size_id: item.selectedBottomSizeId,
      selected_color_id: item.selectedColorId,
      selected_top_size_id: item.selectedTopSizeId,
    })),
    notes: values.notes.trim() || null,
    preferred_contact_method: values.preferred_contact_method,
    requested_date: values.requested_date || null,
  }
}

export async function createGuestOrder(input: CreateGuestOrderInput): Promise<CreateGuestOrderResult> {
  let data: unknown = null
  let error: { message?: string | null; details?: string | null; hint?: string | null } | null = null

  const rpcPayload = {
    p_checkout_token: input.checkout_token,
    p_customer: input.customer,
    p_customer_auth_user_id: input.customer_auth_user_id ?? null,
    p_delivery_method: input.delivery_method,
    p_items: input.items,
    p_notes: input.notes,
    p_preferred_contact_method: input.preferred_contact_method,
    p_requested_date: input.requested_date,
    ...(input.discount_code ? { p_discount_code: input.discount_code } : {}),
  }

  const nextAttempt = await supabase.rpc('create_guest_order', rpcPayload)

  data = nextAttempt.data
  error = nextAttempt.error

  if (error && input.customer_auth_user_id) {
    const legacyAttempt = await supabase.rpc('create_guest_order', {
      p_checkout_token: input.checkout_token,
      p_customer: input.customer,
      p_customer_auth_user_id: input.customer_auth_user_id ?? null,
      p_delivery_method: input.delivery_method,
      p_items: input.items,
      p_notes: input.notes,
      p_preferred_contact_method: input.preferred_contact_method,
      p_requested_date: input.requested_date,
    })

    data = legacyAttempt.data
    error = legacyAttempt.error
  }

  if (error) {
    const diagnostic = [error.message, error.details, error.hint].filter(Boolean).join(' | ')
    throw new Error(translateCheckoutError(diagnostic))
  }

  const order = Array.isArray(data) ? data[0] : data

  if (!order) {
    throw new Error('No fue posible crear el pedido. Intenta nuevamente.')
  }

  return {
    created_at: order.created_at,
    discount_amount: normalizeNumber(order.discount_amount),
    order_id: order.order_id,
    order_number: order.order_number,
    status: order.status,
    subtotal: normalizeNumber(order.subtotal),
    total: normalizeNumber(order.total),
  }
}

export function persistCheckoutSession(session: CheckoutSession) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(session))
}

export function getCheckoutSession(orderNumber: string) {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.sessionStorage.getItem(CHECKOUT_SESSION_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as CheckoutSession
    return parsed.order.order_number === orderNumber ? parsed : null
  } catch {
    return null
  }
}