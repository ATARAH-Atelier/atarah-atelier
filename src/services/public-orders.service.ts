import { normalizePhone } from '../lib/public-utils'
import { supabase } from '../lib/supabase'
import { normalizeNumber } from '../lib/utils'
import type { PublicOrderStatus } from '../types/public-order'

function mapPublicOrderStatus(result: any): PublicOrderStatus {
  return {
    balance: result.status === 'cancelled' ? 0 : normalizeNumber(result.balance),
    created_at: result.created_at,
    delivery_method: result.delivery_method,
    items: (result.items ?? []).map((item: any) => ({
      blouse_size: item.blouse_size ?? null,
      color_hex: item.color_hex ?? null,
      color_name: item.color_name ?? null,
      line_total: normalizeNumber(item.line_total),
      notes: item.notes ?? null,
      pants_size: item.pants_size ?? null,
      product_name_snapshot: item.product_name_snapshot,
      quantity: item.quantity,
      unit_price: normalizeNumber(item.unit_price),
    })),
    order_number: result.order_number,
    paid_amount: normalizeNumber(result.paid_amount),
    requested_date: result.requested_date,
    status: result.status,
    timeline: (result.timeline ?? []).map((entry: any) => ({
      created_at: entry.created_at ?? null,
      status: entry.status,
    })),
    total: normalizeNumber(result.total),
    updated_at: result.updated_at,
  }
}

export async function getGuestOrderStatus(orderNumber: string, phone: string): Promise<PublicOrderStatus> {
  const { data, error } = await supabase.rpc('get_guest_order_status', {
    p_order_number: orderNumber,
    p_phone: normalizePhone(phone),
  })

  if (error) {
    throw new Error('No encontramos un pedido con esos datos.')
  }

  const result = Array.isArray(data) ? data[0] : data

  if (!result) {
    throw new Error('No encontramos un pedido con esos datos.')
  }

  return mapPublicOrderStatus(result)
}

export async function getCustomerOrderStatus(orderNumber: string, userId: string): Promise<PublicOrderStatus> {
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, phone')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (customerError || !customer) {
    throw new Error('No fue posible localizar el pedido para esta cuenta.')
  }

  if (!customer.phone) {
    throw new Error('Tu cuenta no tiene un telefono registrado para consultar el detalle del pedido.')
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (orderError || !order) {
    throw new Error('No encontramos ese pedido dentro de tu cuenta.')
  }

  const { data, error } = await supabase.rpc('get_guest_order_status', {
    p_order_number: orderNumber,
    p_phone: normalizePhone(customer.phone),
  })

  if (error) {
    throw new Error('No fue posible consultar el detalle del pedido.')
  }

  const result = Array.isArray(data) ? data[0] : data

  if (!result) {
    throw new Error('No encontramos ese pedido dentro de tu cuenta.')
  }

  return mapPublicOrderStatus(result)
}

