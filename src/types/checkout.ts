import type { AppliedDiscount, SellerOrderDraftItem } from './database'
import type { CartItem } from './cart'

export interface CheckoutFormValues {
  acceptsMadeToOrder: boolean
  address: string
  city: string
  delivery_method: 'retiro' | 'delivery' | 'envio_nacional'
  discount_code: string
  email: string
  full_name: string
  notes: string
  phone: string
  preferred_contact_method: 'whatsapp' | 'call' | 'email'
  requested_date: string
  state: string
}

export interface CreateGuestOrderInput {
  checkout_token: string
  customer: {
    address: string
    city: string
    email: string | null
    full_name: string
    phone: string
    state: string | null
  }
  customer_auth_user_id?: string | null
  delivery_method: CheckoutFormValues['delivery_method']
  discount_code?: string | null
  items: Array<{
    notes: string | null
    product_id: string
    quantity: number
    selected_bottom_size_id: string | null
    selected_color_id: string | null
    selected_top_size_id: string | null
  }>
  notes: string | null
  preferred_contact_method: CheckoutFormValues['preferred_contact_method']
  requested_date: string | null
}

export interface CreateStaffOrderInput extends Omit<CreateGuestOrderInput, 'items'> {
  initial_payment_amount: number
  manual_discount_amount?: number
  initial_payment_method: string | null
  initial_payment_notes: string | null
  items: SellerOrderDraftItem[]
  order_status?: string
  paid_at?: string | null
}

export interface CreateGuestOrderResult {
  created_at: string
  discount_amount?: number
  order_id: string
  order_number: string
  status: string
  subtotal?: number
  total: number
}

export interface CheckoutSession {
  appliedDiscount?: AppliedDiscount | null
  order: CreateGuestOrderResult
  summaryItems: CartItem[]
}
