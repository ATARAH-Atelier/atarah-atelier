import { Link, useParams } from 'react-router-dom'
import { Clock, Ruler, ShieldCheck, ArrowLeft, ShoppingBag } from 'lucide-react'
import { useRef, useState } from 'react'

import { Alert } from '../../components/public/Alert'
import { Breadcrumb } from '../../components/public/Breadcrumb'
import { ProductGallery } from '../../components/public/ProductGallery'
import { TrustNotice } from '../../components/public/TrustNotice'
import { EmptyState } from '../../components/common/EmptyState'
import { Button } from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePublicProduct } from '../../features/catalog/hooks/usePublicProduct'
import { ProductDetailsForm } from '../../features/catalog/components/ProductDetailsForm'
import { formatCurrency } from '../../lib/utils'

export function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug ?? ''
  const productQuery = usePublicProduct(slug)
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  useDocumentTitle(
    productQuery.data
      ? `${productQuery.data.name} | Atarah Atelier`
      : 'Producto | Atarah Atelier',
  )

  // Scroll the gallery into view when a color is picked — only on mobile,
  // since on desktop the gallery is already side-by-side with the form.
  function handleColorChange(colorId: string | null) {
    setSelectedColorId(colorId)
    if (colorId && typeof window !== 'undefined' && window.innerWidth < 1024) {
      galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (productQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="h-[500px] animate-pulse rounded-3xl bg-atarah-cream-100" />
          <div className="space-y-4">
            <div className="h-6 w-24 animate-pulse rounded-full bg-atarah-cream-100" />
            <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-atarah-cream-100" />
            <div className="h-8 w-32 animate-pulse rounded-2xl bg-atarah-cream-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-atarah-cream-100" />
            <div className="h-12 w-full animate-pulse rounded-2xl bg-atarah-cream-100" />
          </div>
        </div>
      </div>
    )
  }

  if (productQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <Alert tone="error">{productQuery.error.message}</Alert>
      </div>
    )
  }

  const product = productQuery.data ?? null
  const effectiveSelectedColorId = selectedColorId ?? product?.colors[0]?.id ?? null
  const selectedColorName = product?.colors.find((color) => color.id === effectiveSelectedColorId)?.color_name ?? null

  if (!product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <EmptyState
          icon={ShoppingBag}
          title="Producto no encontrado"
          description="Es posible que el producto ya no esté activo o que el enlace no exista."
          action={
            <Link to="/productos">
              <Button leftIcon={<ArrowLeft className="size-4" />}>
                Ir al catálogo
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#fcf8f2_0%,#f5ede3_40%,#fcf8f2_100%)] pb-28 lg:pb-0">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10 lg:px-8">
        <Breadcrumb
          items={[
            { href: '/', label: 'Inicio' },
            { href: '/productos', label: 'Catálogo' },
            { label: product.name },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-8">
          {/* order-1 forces the gallery first on mobile, regardless of source order */}
          <div
            ref={galleryRef}
            className="relative order-1 -mx-4 scroll-mt-4 sm:mx-0 lg:order-none"
          >
            <ProductGallery
              fallbackImage={product.main_image}
              images={product.images}
              productName={product.name}
              selectedColorName={selectedColorName}
            />
          </div>

          <div className="order-2 space-y-6 sm:space-y-8 lg:order-none lg:sticky lg:top-28">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-atarah-cream-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-atarah-wine-900">
                  {product.category}
                </span>
                {product.estimated_days && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    <Clock className="size-3" />
                    {product.estimated_days} días
                  </span>
                )}
              </div>

              <h1 className="font-display text-3xl font-bold leading-tight text-atarah-wine-900 sm:text-4xl lg:text-5xl">
                {product.name}
              </h1>

              <p className="text-sm leading-6 text-atarah-charcoal-600 sm:text-base sm:leading-7">
                {product.description || 'Prenda confeccionada a medida bajo pedido.'}
              </p>

              <div className="flex items-baseline gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-atarah-gold-700 sm:text-sm">
                  Desde
                </span>
                <span className="font-display text-3xl font-bold text-atarah-wine-900 sm:text-4xl">
                  {formatCurrency(product.min_price)}
                </span>
              </div>
              <p className="text-xs text-atarah-charcoal-500 sm:text-sm">
                El precio final puede variar según talla y color seleccionados.
              </p>
            </div>

            <div className="flex items-center divide-x divide-atarah-gold-200 rounded-2xl border border-atarah-gold-200 bg-white/70 shadow-sm">
              <div className="flex flex-1 items-center gap-2.5 px-4 py-3">
                <Ruler className="size-4 shrink-0 text-atarah-wine-700 sm:size-5" />
                <div>
                  <p className="text-xs font-semibold leading-tight text-atarah-charcoal-900 sm:text-sm">
                    A medida
                  </p>
                  <p className="text-[11px] leading-tight text-atarah-charcoal-500 sm:text-xs">
                    Ajustada a tus tallas
                  </p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-2.5 px-4 py-3">
                <ShieldCheck className="size-4 shrink-0 text-atarah-wine-700 sm:size-5" />
                <div>
                  <p className="text-xs font-semibold leading-tight text-atarah-charcoal-900 sm:text-sm">
                    Pago seguro
                  </p>
                  <p className="text-[11px] leading-tight text-atarah-charcoal-500 sm:text-xs">
                    Al confirmar pedido
                  </p>
                </div>
              </div>
            </div>

            <TrustNotice />

            <div className="rounded-3xl border border-atarah-gold-200 bg-white p-5 shadow-xl shadow-atarah-gold-200/20 sm:p-6">
              <ProductDetailsForm
                product={product}
                selectedColorId={effectiveSelectedColorId}
                onSelectedColorChange={handleColorChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}