import { normalizePhone } from '../lib/public-utils'
import { supabase } from '../lib/supabase'
import type { Customer, CustomerRow, UpdateAdminCustomerInput } from '../types/database'

export async function getAdminCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, city, state, address, auth_user_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('No fue posible consultar los clientes.')
  }

  const customers = (data ?? []) as CustomerRow[]

  if (!customers.length) {
    return []
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, customer_id')
    .in(
      'customer_id',
      customers.map((customer) => customer.id),
    )

  if (ordersError) {
    throw new Error('No fue posible calcular la cantidad de pedidos por cliente.')
  }

  const counts = new Map<string, number>()

  for (const order of orders ?? []) {
    if (!order.customer_id) {
      continue
    }

    counts.set(order.customer_id, (counts.get(order.customer_id) ?? 0) + 1)
  }

  return customers.map((customer) => ({
    ...customer,
    orders_count: counts.get(customer.id) ?? 0,
  }))
}

export async function updateAdminCustomer(id: string, input: UpdateAdminCustomerInput): Promise<CustomerRow> {
  const payload = {
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    email: input.email?.trim() || null,
    full_name: input.full_name.trim(),
    phone: input.phone?.trim() ? normalizePhone(input.phone) : null,
    state: input.state?.trim() || null,
  }

  if (!payload.full_name) {
    throw new Error('El nombre del cliente es obligatorio.')
  }

  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select('id, full_name, phone, email, city, state, address, auth_user_id, created_at')
    .single()

  if (error || !data) {
    throw new Error('No fue posible actualizar el cliente.')
  }

  if (data.auth_user_id) {
    await supabase
      .from('profiles')
      .update({ full_name: payload.full_name })
      .eq('id', data.auth_user_id)
  }

  return data as CustomerRow
}
