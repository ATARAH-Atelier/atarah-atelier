import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Alert } from '../../components/public/Alert'
import { ProductGrid } from '../../components/public/ProductGrid'
import { TrustNotice } from '../../components/public/TrustNotice'
import { EmptyState } from '../../components/common/EmptyState'
import { Button } from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { CatalogFilters } from '../../features/catalog/components/CatalogFilters'
import { usePublicProducts } from '../../features/catalog/hooks/usePublicProducts'
import type { PublicProductFilters } from '../../types/catalog'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<PublicProductFilters>(() => {
    const sort = searchParams.get('orden')

    return {
      category: searchParams.get('categoria') || undefined,
      featuredOnly: searchParams.get('destacados') === '1',
      search: searchParams.get('buscar') || undefined,
      sort: sort === 'price_asc' || sort === 'price_desc' || sort === 'recent' ? sort : 'recommended',
    }
  })
  const { categoriesQuery, productsQuery } = usePublicProducts(filters)

  useDocumentTitle('Uniformes médicos | Atarah Atelier')

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])

  function updateFilters(nextFilters: PublicProductFilters) {
    const nextSearchParams = new URLSearchParams()

    if (nextFilters.search?.trim()) {
      nextSearchParams.set('buscar', nextFilters.search)
    }
    if (nextFilters.category) {
      nextSearchParams.set('categoria', nextFilters.category)
    }
    if (nextFilters.featuredOnly) {
      nextSearchParams.set('destacados', '1')
    }
    if (nextFilters.sort && nextFilters.sort !== 'recommended') {
      nextSearchParams.set('orden', nextFilters.sort)
    }

    setFilters(nextFilters)
    setSearchParams(nextSearchParams, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10 lg:px-8">
      <div className="space-y-2.5 sm:space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-atarah-gold-700 sm:text-sm">
          Catálogo
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight text-atarah-wine-900 sm:text-4xl lg:text-5xl">
          Uniformes médicos confeccionados bajo pedido
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-atarah-charcoal-600 sm:text-base sm:leading-7">
          Explora los modelos activos de Atarah Atelier, elige tu estilo y personaliza talla, color y detalles antes de solicitar tu pedido.
        </p>
      </div>

      <TrustNotice />

      {/* Filtros pegados arriba al scrollear en mobile, para no perderlos entre productos */}
      <div className="sticky top-0 z-10 -mx-4 bg-[#fcf8f2]/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <CatalogFilters categories={categories} filters={filters} onChange={updateFilters} />
      </div>

      {productsQuery.isError ? (
        <Alert tone="error">
          <p>{productsQuery.error.message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void productsQuery.refetch()}>
            Intentar nuevamente
          </Button>
        </Alert>
      ) : productsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[320px] animate-pulse rounded-3xl bg-white sm:h-[420px] sm:rounded-[2rem]" />
          ))}
        </div>
      ) : productsQuery.data?.length ? (
        <ProductGrid products={productsQuery.data} />
      ) : (
        <EmptyState
          title="No encontramos productos con esos filtros"
          description="Ajusta la búsqueda o vuelve a ver todos los productos activos del catálogo."
          action={
            <Link to="/productos">
              <Button>Ver catálogo completo</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
