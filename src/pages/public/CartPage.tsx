import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ArrowLeft,
  PackageOpen,
  Palette,
  Ruler,
} from 'lucide-react'
import { Alert } from '../../components/public/Alert'
import { EmptyState } from '../../components/common/EmptyState'
import { QuantitySelector } from '../../components/public/QuantitySelector'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useAuth } from '../../hooks/useAuth'
import { useCart } from '../../features/cart/hooks/useCart'
import { formatCurrency } from '../../lib/utils'

export function CartPage() {
  const { decreaseItem, increaseItem, items, removeItem, total } = useCart()
  const { isAuthenticated } = useAuth()
  useDocumentTitle('Carrito | Atarah Atelier')

  if (!items.length) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <EmptyState
          icon={ShoppingBag}
          title="Tu carrito está vacío"
          description="Explora el catálogo y agrega prendas personalizadas para iniciar tu pedido."
          action={
            <Link to="/catalogo">
              <Button size="lg" leftIcon={<ArrowRight className="size-5" />}>
                Ir al catálogo
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#fcf8f2_0%,#f5ede3_40%,#fcf8f2_100%)]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:space-y-8 sm:py-10 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-atarah-wine-900 sm:text-5xl">
              Carrito
            </h1>
            <p className="mt-3 max-w-xl text-sm text-atarah-charcoal-600 sm:text-base">
              Revisa tus selecciones. El monto final será verificado por Atarah
              Atelier al confirmar el pedido.
            </p>
          </div>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 text-sm font-medium text-atarah-charcoal-700 transition-colors hover:text-atarah-wine-800"
          >
            <ArrowLeft className="size-4" />
            Seguir comprando
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-4">
            {items.map((item) => (
              <Card
                key={item.cartItemId}
                className="group relative overflow-hidden border-0 bg-white p-4 shadow-md shadow-atarah-gold-200/20 transition-all hover:shadow-xl hover:shadow-atarah-gold-200/30 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
                  <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-atarah-cream-100 sm:h-28 sm:w-28">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <PackageOpen className="size-8 text-atarah-charcoal-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-atarah-charcoal-900">
                          {item.name}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {item.selectedTopSize && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-atarah-cream-100 px-2.5 py-1 text-xs font-medium text-atarah-charcoal-800">
                              <Ruler className="size-3" />
                              Blusa: {item.selectedTopSize}
                            </span>
                          )}
                          {item.selectedBottomSize && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-atarah-cream-100 px-2.5 py-1 text-xs font-medium text-atarah-charcoal-800">
                              <Ruler className="size-3" />
                              Pantalón: {item.selectedBottomSize}
                            </span>
                          )}
                          {item.selectedColor && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-atarah-cream-100 px-2.5 py-1 text-xs font-medium text-atarah-charcoal-800">
                              <Palette className="size-3" />
                              {item.selectedColor}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.cartItemId)}
                        className="hidden rounded-full p-2 text-rose-600 transition-colors hover:bg-rose-50 sm:block"
                        aria-label="Eliminar producto"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    {item.customerNotes && (
                      <p className="text-sm italic text-atarah-charcoal-600">
                        “{item.customerNotes}”
                      </p>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(value) => {
                          if (value > item.quantity) increaseItem(item.cartItemId)
                          if (value < item.quantity) decreaseItem(item.cartItemId)
                        }}
                      />
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-atarah-charcoal-500">
                          Unitario: {formatCurrency(item.unitPrice)}
                        </p>
                        <p className="text-lg font-bold text-atarah-wine-900">
                          {formatCurrency(item.lineTotal)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.cartItemId)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 sm:hidden"
                    >
                      <Trash2 className="size-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="lg:sticky lg:top-24">
            <Card className="border-0 bg-white p-5 shadow-xl shadow-atarah-gold-200/20 ring-1 ring-atarah-gold-100/70 sm:p-6">
              <div className="flex items-center gap-3 border-b border-atarah-gold-200 pb-5">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-atarah-wine-100">
                  <ShoppingBag className="size-5 text-atarah-wine-700" />
                </div>
                <h2 className="font-display text-2xl font-bold text-atarah-wine-900">
                  Resumen
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between gap-4 text-sm text-atarah-charcoal-600">
                  <span>Subtotal ({items.length} productos)</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm text-atarah-charcoal-600">
                  <span>Envío</span>
                  <span className="text-emerald-600">Por confirmar</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-atarah-gold-200 pt-3 text-lg font-bold text-atarah-wine-900">
                  <span>Total estimado</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-atarah-charcoal-600">
                El precio final puede variar según talla, color y disponibilidad.
                Te confirmaremos el total exacto al procesar tu pedido.
              </p>

              {!isAuthenticated ? (
                <Alert className="mt-4">
                  Inicia sesión o crea una cuenta para continuar con tu pedido.
                </Alert>
              ) : null}

              <div className="mt-5 space-y-3">
                <Link
                  to={isAuthenticated ? '/checkout' : '/acceso'}
                  state={isAuthenticated ? undefined : { from: '/checkout' }}
                >
                  <Button
                    className="w-full bg-atarah-wine-900 shadow-lg shadow-atarah-wine-900/20 transition-all hover:bg-atarah-wine-800 hover:shadow-xl hover:shadow-atarah-wine-900/30 active:scale-[0.98]"
                    size="lg"
                    rightIcon={<ArrowRight className="size-5" />}
                  >
                    {isAuthenticated ? 'Continuar al checkout' : 'Entrar para pedir'}
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}