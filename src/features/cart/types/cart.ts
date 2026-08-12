import type { CartItem } from '../../../types/cart'

export interface StoredCart {
  items: CartItem[]
  version: number
}
