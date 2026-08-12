import { createContext } from 'react'

import type { CartContextValue } from './CartContext'

export const CartContext = createContext<CartContextValue | undefined>(undefined)
