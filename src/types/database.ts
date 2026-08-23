export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'waiting_for_payment'
  | 'in_production'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export type ProductSizeType = 'top' | 'bottom'

export interface ProductRow {
  base_price: number | string | null
  category: string | null
  category_id?: string | null
  created_at: string | null
  description: string | null
  estimated_days: number | null
  id: string
  image_url: string | null
  is_active: boolean | null
  is_featured: boolean | null
  name: string
  slug: string
  updated_at: string | null
}

export interface ProductSizeRow {
  id: string
  price_adjustment: number | string | null
  product_id: string
  size: string
  size_type: ProductSizeType
}

export interface ProductColorRow {
  color_hex: string | null
  color_name: string
  id: string
  price_adjustment: number | string | null
  product_id: string
}

export interface ProductImageRow {
  color_name?: string | null
  created_at: string | null
  display_order: number | null
  id: string
  image_url: string | null
  product_id: string
}

export interface ProductCategoryRow {
  created_at: string | null
  id: string
  is_active: boolean | null
  name: string
  slug: string
  updated_at: string | null
}

export interface ProductSize {
  id?: string
  price_adjustment: number
  product_id?: string
  size: string
  size_type?: ProductSizeType
}

export interface ProductColor {
  color_hex: string
  color_name: string
  id?: string
  price_adjustment: number
  product_id?: string
}

export interface ProductImage {
  color_name: string | null
  created_at: string | null
  display_order: number
  id: string
  image_url: string
  product_id: string
  storage_path: string | null
}

export interface ProductCategory extends ProductCategoryRow {
  is_active: boolean
}

export interface Product {
  base_price: number
  category: string
  category_id?: string | null
  colors: ProductColor[]
  created_at: string | null
  description: string | null
  estimated_days: number
  id: string
  image_url: string | null
  images: ProductImage[]
  is_active: boolean
  is_featured: boolean
  main_image: string | null
  name: string
  option_groups?: ProductOptionGroup[]
  sizes_bottom: ProductSize[]
  sizes_top: ProductSize[]
  slug: string
  updated_at: string | null
}

export interface ProductFormImage {
  color_name?: string | null
  file?: File
  id?: string
  image_url: string
  isNew?: boolean
  markedForDeletion?: boolean
  storage_path?: string | null
}

export interface ProductFormValues {
  base_price: number
  category: string
  category_id: string
  colors: ProductColor[]
  description: string
  estimated_days: number
  images: ProductFormImage[]
  is_active: boolean
  is_featured: boolean
  name: string
  option_groups?: ProductOptionGroup[]
  sizes_bottom: ProductSize[]
  sizes_top: ProductSize[]
  slug: string
}

export interface ProductCategoryInput {
  is_active: boolean
  name: string
  slug: string
}

export interface ProductCreateInput {
  base_price: number
  category: string
  category_id: string
  colors: ProductColor[]
  description: string | null
  estimated_days: number
  images: ProductFormImage[]
  is_active: boolean
  is_featured: boolean
  name: string
  option_groups?: ProductOptionGroup[]
  sizes_bottom: ProductSize[]
  sizes_top: ProductSize[]
  slug: string
}

export interface ProductUpdateInput extends ProductCreateInput {
  existingImages: ProductImage[]
}

export interface AdminProductFilters {
  category?: string
  category_id?: string
  is_active?: boolean
  search?: string
}

export interface CustomerRow {
  address?: string | null
  auth_user_id?: string | null
  city: string | null
  created_at: string | null
  email: string | null
  full_name: string
  id: string
  phone: string | null
  state: string | null
}

export interface Customer extends CustomerRow {
  orders_count: number
}

export interface UpdateAdminCustomerInput {
  address: string | null
  city: string | null
  email: string | null
  full_name: string
  phone: string | null
  state: string | null
}

export interface OrderRow {
  balance?: number | string | null
  created_at: string | null
  customer_id: string | null
  discount_amount?: number | string | null
  discount_code?: string | null
  paid_amount: number | string | null
  id: string
  order_number: string
  requested_date: string | null
  seller_profile_id?: string | null
  source?: string | null
  status: OrderStatus
  total: number | string | null
}

export interface Order {
  balance: number
  created_at: string | null
  customer_name: string | null
  deposit: number
  discount_amount: number
  discount_code: string | null
  id: string
  items?: AdminOrderItem[]
  order_number: string
  requested_date: string | null
  seller_name?: string | null
  source?: string | null
  status: OrderStatus
  total: number
}

export interface AdminOrderItem {
  blouse_size: string | null
  color_hex: string | null
  color_name: string | null
  id: string
  line_total: number
  notes: string | null
  pants_size: string | null
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
}

export interface AdminOrderTimelineEntry {
  created_at: string | null
  status: OrderStatus
}

export interface OrderPayment {
  amount: number
  created_at: string | null
  id: string
  notes: string | null
  paid_at: string | null
  payment_method: string | null
  recorded_by_name: string | null
  recorded_by_profile_id: string | null
}

export interface AdminOrderDetail extends Order {
  customer_address: string | null
  customer_city: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_state: string | null
  delivery_method: string | null
  items: AdminOrderItem[]
  notes: string | null
  payments: OrderPayment[]
  preferred_contact_method: string | null
  seller_name: string | null
  subtotal: number
  timeline: AdminOrderTimelineEntry[]
  updated_at: string | null
}

export interface UpdateAdminOrderInput {
  customer_address?: string | null
  customer_city?: string | null
  customer_email?: string | null
  customer_full_name?: string | null
  customer_phone?: string | null
  customer_state?: string | null
  delivery_method?: string | null
  notes?: string | null
  paid_amount: number
  preferred_contact_method?: string | null
  status: OrderStatus
}

export interface UpdateAdminOrderItemInput {
  id: string
  notes: string | null
  product_id: string
  quantity: number
  selected_bottom_size_id: string | null
  selected_color_id: string | null
  selected_top_size_id: string | null
}

export interface CreateOrderPaymentInput {
  amount: number
  notes: string | null
  paid_at: string | null
  payment_method: string | null
}

export interface UpdateOrderPaymentInput extends CreateOrderPaymentInput {}

export interface SellerOrderDraftItem {
  notes: string | null
  product_id: string
  product_name: string
  quantity: number
  selected_bottom_size_id: string | null
  selected_bottom_size_name: string | null
  selected_color_id: string | null
  selected_color_name: string | null
  selected_top_size_id: string | null
  selected_top_size_name: string | null
  unit_price: number
}

export interface DiscountCodeRow {
  code: string
  created_at: string | null
  description: string | null
  ends_at: string | null
  id: string
  is_active: boolean | null
  min_order_amount: number | string | null
  starts_at: string | null
  type: 'fixed' | 'percentage'
  updated_at: string | null
  usage_limit: number | null
  uses_count?: number | null
  value: number | string | null
}

export interface DiscountCode extends DiscountCodeRow {
  is_active: boolean
  min_order_amount: number
  value: number
}

export interface DiscountCodeInput {
  code: string
  description: string | null
  ends_at: string | null
  is_active: boolean
  min_order_amount: number
  starts_at: string | null
  type: 'fixed' | 'percentage'
  usage_limit: number | null
  value: number
}

export interface AppliedDiscount {
  code: string
  discount_amount: number
  discount_code_id: string
  final_total: number
  subtotal: number
}

export interface ProductOptionValue {
  id: string
  option_group_id: string
  value: string
  price_adjustment: number
  display_order: number
  is_active: boolean
}

export interface ProductOptionGroup {
  id: string
  product_id: string
  name: string
  slug: string
  display_order: number
  is_required: boolean
  values: ProductOptionValue[]
}