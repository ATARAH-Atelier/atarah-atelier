import { ArrowRight, ShoppingBag } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../features/cart/hooks/useCart'
import { formatCurrency } from '../../lib/utils'
const hiddenPaths = new Set(['/carrito', '/checkout'])
export function StickyCartCta() {
  const location = useLocation()
  const { total, totalItems } = useCart()
  if (!totalItems || hiddenPaths.has(location.pathname) || location.pathname.startsWith('/admin')) {
    return null
  }
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/carrito"
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-atarah-wine-900/20 bg-atarah-wine-900 px-4 py-3 text-white shadow-2xl shadow-atarah-wine-900/25 transition hover:bg-atarah-wine-800 sm:ml-auto sm:max-w-md"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/14">
              <ShoppingBag className="size-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Ir al carrito</p>
              <p className="truncate text-xs text-white/80">
                {totalItems} {totalItems === 1 ? 'producto' : 'productos'} ? {formatCurrency(total)}
              </p>
            </div>
          </div>
          <ArrowRight className="size-5 shrink-0 text-white" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
