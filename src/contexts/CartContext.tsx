import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'

import { CartContext } from './cart-context'
import { storedCartSchema } from '../features/cart/services/cart-storage.service'
import type { CartItem, CartState } from '../types/cart'

const CART_STORAGE_KEY = 'atarah_cart_v1'

export interface CartContextValue extends CartState {
  addItem: (item: CartItem) => void
  clearCart: () => void
  decreaseItem: (cartItemId: string) => void
  getItemQuantity: (cartItemId: string) => number
  increaseItem: (cartItemId: string) => void
  removeItem: (cartItemId: string) => void
  replaceCart: (items: CartItem[]) => void
  updateItemNotes: (cartItemId: string, notes: string) => void
}

function calculateCartState(items: CartItem[]): CartState {
  return {
    items,
    total: items.reduce((sum, item) => sum + item.lineTotal, 0),
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

function persistItems(items: CartItem[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      items,
      version: 1,
    }),
  )
}

function restoreItems() {
  if (typeof window === 'undefined') {
    return [] as CartItem[]
  }

  const rawValue = window.localStorage.getItem(CART_STORAGE_KEY)

  if (!rawValue) {
    return [] as CartItem[]
  }

  try {
    const parsed = JSON.parse(rawValue)
    const result = storedCartSchema.safeParse(parsed)

    if (!result.success) {
      window.localStorage.removeItem(CART_STORAGE_KEY)
      return [] as CartItem[]
    }

    return result.data.items
  } catch {
    window.localStorage.removeItem(CART_STORAGE_KEY)
    return [] as CartItem[]
  }
}

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>(() => restoreItems())

  useEffect(() => {
    persistItems(items)
  }, [items])

  function addItem(item: CartItem) {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (currentItem) => currentItem.cartItemId === item.cartItemId,
      )

      if (!existingItem) {
        return [...currentItems, item]
      }

      return currentItems.map((currentItem) => {
        if (currentItem.cartItemId !== item.cartItemId) {
          return currentItem
        }

        const quantity = Math.min(currentItem.quantity + item.quantity, 20)
        const lineTotal = currentItem.unitPrice * quantity

        return {
          ...currentItem,
          lineTotal,
          quantity,
        }
      })
    })
  }

  function removeItem(cartItemId: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.cartItemId !== cartItemId),
    )
  }

  function increaseItem(cartItemId: string) {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.cartItemId !== cartItemId) {
          return item
        }

        const quantity = Math.min(item.quantity + 1, 20)
        return {
          ...item,
          lineTotal: item.unitPrice * quantity,
          quantity,
        }
      }),
    )
  }

  function decreaseItem(cartItemId: string) {
    setItems((currentItems) =>
      currentItems
        .map((item) => {
          if (item.cartItemId !== cartItemId) {
            return item
          }

          const quantity = item.quantity - 1

          if (quantity <= 0) {
            return null
          }

          return {
            ...item,
            lineTotal: item.unitPrice * quantity,
            quantity,
          }
        })
        .filter((item): item is CartItem => Boolean(item)),
    )
  }

  function updateItemNotes(cartItemId: string, notes: string) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.cartItemId === cartItemId
          ? {
              ...item,
              customerNotes: notes,
            }
          : item,
      ),
    )
  }

  function replaceCart(nextItems: CartItem[]) {
    setItems(nextItems)
  }

  function clearCart() {
    setItems([])
  }

  function getItemQuantity(cartItemId: string) {
    return items.find((item) => item.cartItemId === cartItemId)?.quantity ?? 0
  }

  const state = calculateCartState(items)

  const value: CartContextValue = {
    ...state,
    addItem,
    clearCart,
    decreaseItem,
    getItemQuantity,
    increaseItem,
    items,
    removeItem,
    replaceCart,
    total: state.total,
    totalItems: state.totalItems,
    updateItemNotes,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
