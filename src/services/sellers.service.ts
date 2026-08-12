import { normalizePhone } from '../lib/public-utils'
import { supabase } from '../lib/supabase'
import type { CreateStaffAccountInput } from '../types/auth'
import { createSellerAccount } from './auth.service'

export interface AdminSeller {
  created_at: string | null
  email: string | null
  full_name: string
  id: string
  is_active: boolean
  last_order_at: string | null
  orders_count: number
  phone: string | null
}

export interface UpdateAdminSellerInput {
  email: string | null
  full_name: string
  phone: string | null
}

function translateSellerError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? ''

  if (message.includes('is_active') || message.includes('phone') || message.includes('email')) {
    return 'Falta aplicar la migracion de vendedores en Supabase.'
  }

  if (message.includes('profiles')) {
    return 'No fue posible consultar los perfiles de vendedores.'
  }

  return 'No fue posible completar la operacion con vendedores.'
}

async function fetchSellerRows() {
  let { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, created_at, is_active, email, phone')
    .eq('role', 'seller')
    .order('created_at', { ascending: false })

  if (
    error?.message?.toLowerCase().includes('is_active')
    || error?.message?.toLowerCase().includes('email')
    || error?.message?.toLowerCase().includes('phone')
  ) {
    const fallback = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('role', 'seller')
      .order('created_at', { ascending: false })

    data = (fallback.data ?? []).map((row) => ({ ...row, email: null, is_active: true, phone: null }))
    error = fallback.error
  }

  if (error) {
    throw new Error(translateSellerError(error))
  }

  return (data ?? []) as Array<{
    created_at: string | null
    email?: string | null
    full_name: string
    id: string
    is_active?: boolean | null
    phone?: string | null
  }>
}

async function fetchSellerOrderStats(sellerIds: string[]) {
  if (!sellerIds.length) {
    return new Map<string, { last_order_at: string | null; orders_count: number }>()
  }

  const { data, error } = await supabase
    .from('orders')
    .select('seller_profile_id, created_at')
    .in('seller_profile_id', sellerIds)

  if (error) {
    throw new Error('No fue posible consultar las ventas de los vendedores.')
  }

  const stats = new Map<string, { last_order_at: string | null; orders_count: number }>()

  for (const row of data ?? []) {
    const sellerId = row.seller_profile_id as string | null

    if (!sellerId) {
      continue
    }

    const current = stats.get(sellerId) ?? { last_order_at: null, orders_count: 0 }
    const nextCreatedAt = row.created_at as string | null

    stats.set(sellerId, {
      last_order_at:
        !current.last_order_at || (nextCreatedAt && new Date(nextCreatedAt).getTime() > new Date(current.last_order_at).getTime())
          ? nextCreatedAt
          : current.last_order_at,
      orders_count: current.orders_count + 1,
    })
  }

  return stats
}

export async function getAdminSellers(): Promise<AdminSeller[]> {
  const rows = await fetchSellerRows()
  const stats = await fetchSellerOrderStats(rows.map((row) => row.id))

  return rows.map((row) => {
    const sellerStats = stats.get(row.id)

    return {
      created_at: row.created_at,
      email: row.email ?? null,
      full_name: row.full_name,
      id: row.id,
      is_active: row.is_active ?? true,
      last_order_at: sellerStats?.last_order_at ?? null,
      orders_count: sellerStats?.orders_count ?? 0,
      phone: row.phone ?? null,
    }
  })
}

export async function createAdminSeller(input: CreateStaffAccountInput) {
  await createSellerAccount(input)
}

export async function updateAdminSeller(id: string, input: UpdateAdminSellerInput) {
  const { error } = await supabase
    .from('profiles')
    .update({
      email: input.email?.trim() || null,
      full_name: input.full_name.trim(),
      phone: input.phone?.trim() ? normalizePhone(input.phone) : null,
    })
    .eq('id', id)
    .eq('role', 'seller')

  if (error) {
    throw new Error(translateSellerError(error))
  }
}

export async function setAdminSellerActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('role', 'seller')

  if (error) {
    throw new Error(translateSellerError(error))
  }
}