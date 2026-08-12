import { normalizePhone } from '../lib/public-utils'
import { supabase } from '../lib/supabase'
import { normalizeNumber } from '../lib/utils'
import type { AdminOrderItem, CustomerRow, Order, OrderRow } from '../types/database'

interface CustomerAccountSnapshot {
  customer: CustomerRow | null
  orders: Order[]
}

interface UpdateCustomerProfileInput {
  address: string
  city: string
  email: string | null
  full_name: string
  phone: string
  state: string
}

interface OrderItemRow {
  color_hex?: string | null
  color_name?: string | null
  line_total?: number | string | null
  product_name?: string | null
  product_name_snapshot?: string | null
  quantity?: number | null
  blouse_size?: string | null
  pants_size?: string | null
  subtotal?: number | string | null
  total?: number | string | null
  unit_price?: number | string | null
}

export async function getCustomerAccount(userId: string): Promise<CustomerAccountSnapshot> {
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, city, state, address, created_at, auth_user_id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (customerError) {
    throw new Error('No fue posible consultar tu perfil de cliente.')
  }

  if (!customer) {
    return { customer: null, orders: [] }
  }

  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number, status, total, discount_amount, discount_code, paid_amount, balance, created_at, requested_date, customer_id')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })

  if (ordersError) {
    throw new Error('No fue posible consultar tus pedidos.')
  }

  const orders = ((ordersData ?? []) as OrderRow[]).map((order) => {
    const total = normalizeNumber(order.total)
    const deposit = normalizeNumber(order.paid_amount)
    const balance = order.balance == null ? Math.max(0, total - deposit) : normalizeNumber(order.balance)

    return {
      balance,
      created_at: order.created_at,
      customer_name: customer.full_name,
      deposit,
      discount_amount: normalizeNumber(order.discount_amount),
      discount_code: order.discount_code ?? null,
      id: order.id,
      items: [],
      order_number: order.order_number,
      requested_date: order.requested_date,
      status: order.status,
      total,
    } satisfies Order
  })

  if (!orders.length) {
    return {
      customer: customer as CustomerRow,
      orders,
    }
  }

  const orderIds = orders.map((order) => order.id)
  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('order_id, product_name, product_name_snapshot, blouse_size, pants_size, color_name, color_hex, quantity, unit_price, subtotal, total, line_total')
    .in('order_id', orderIds)

  if (itemsError) {
    throw new Error('No fue posible consultar los productos de tus pedidos.')
  }

  const itemsByOrderId = new Map<string, AdminOrderItem[]>()

  ;((itemsData ?? []) as Array<OrderItemRow & { order_id: string }>).forEach((item) => {
    const orderItems = itemsByOrderId.get(item.order_id) ?? []
    const unitPrice = normalizeNumber(item.unit_price)
    const quantity = item.quantity ?? 0
    const lineTotal = item.line_total ?? item.total ?? item.subtotal ?? unitPrice * quantity

    orderItems.push({
      blouse_size: item.blouse_size ?? null,
      color_hex: item.color_hex ?? null,
      color_name: item.color_name ?? null,
      line_total: normalizeNumber(lineTotal),
      notes: null,
      pants_size: item.pants_size ?? null,
      product_name: item.product_name_snapshot ?? item.product_name ?? 'Producto sin nombre',
      quantity,
      unit_price: unitPrice,
    })

    itemsByOrderId.set(item.order_id, orderItems)
  })

  const ordersWithItems = orders.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) ?? [],
  }))

  return {
    customer: customer as CustomerRow,
    orders: ordersWithItems,
  }
}

export async function updateCustomerProfile(userId: string, input: UpdateCustomerProfileInput) {
  const trimmedFullName = input.full_name.trim()
  const trimmedPhone = input.phone.trim()
  const trimmedCity = input.city.trim()
  const trimmedState = input.state.trim()
  const trimmedAddress = input.address.trim()
  const trimmedEmail = input.email?.trim() || null

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: trimmedFullName })
    .eq('id', userId)

  if (profileError) {
    throw new Error(`No fue posible actualizar el nombre de tu perfil: ${profileError.message}`)
  }

  const payload = {
    address: trimmedAddress || null,
    auth_user_id: userId,
    city: trimmedCity || null,
    email: trimmedEmail,
    full_name: trimmedFullName,
    phone: normalizePhone(trimmedPhone),
    state: trimmedState || null,
  }

  const { data: existingCustomer, error: existingCustomerError } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (existingCustomerError) {
    throw new Error(`No fue posible validar tu ficha de cliente: ${existingCustomerError.message}`)
  }

  if (existingCustomer?.id) {
    const { error: updateError } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', existingCustomer.id)

    if (updateError) {
      throw new Error(`No fue posible actualizar tu informacion de cliente: ${updateError.message}`)
    }

    return existingCustomer.id
  }

  const { data: createdCustomer, error: insertError } = await supabase
    .from('customers')
    .insert(payload)
    .select('id')
    .single()

  if (insertError || !createdCustomer) {
    throw new Error(`No fue posible crear tu informacion de cliente: ${insertError?.message ?? 'sin detalle'}`)
  }

  return createdCustomer.id
}
