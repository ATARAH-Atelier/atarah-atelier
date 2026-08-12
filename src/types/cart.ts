export interface CartItem {
  basePrice: number
  bottomSizeAdjustment: number
  cartItemId: string
  colorAdjustment: number
  customerNotes: string
  estimatedDays: number
  imageUrl: string | null
  lineTotal: number
  name: string
  productId: string
  quantity: number
  selectedBottomSize: string | null
  selectedBottomSizeId: string | null
  selectedColor: string | null
  selectedColorHex: string | null
  selectedColorId: string | null
  selectedTopSize: string | null
  selectedTopSizeId: string | null
  slug: string
  topSizeAdjustment: number
  unitPrice: number
}

export interface CartState {
  items: CartItem[]
  total: number
  totalItems: number
}
