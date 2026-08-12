import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

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
  const [filters, setFilters] = useState<PublicProductFilters>({ sort: 'recommended' })
  const { categoriesQuery, productsQuery } = usePublicProducts(filters)

  useDocumentTitle('Uniformes médicos | Atarah Atelier')

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 lg:px-8">
      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-atarah-gold-700">Catálogo</p>
        <h1 className="font-display text-5xl font-bold text-atarah-wine-900">Uniformes médicos confeccionados bajo pedido</h1>
        <p className="max-w-3xl text-base leading-7 text-atarah-charcoal-600">Explora los modelos activos de Atarah Atelier, elige tu estilo y personaliza talla, color y detalles antes de solicitar tu pedido.</p>
      </div>

      <TrustNotice />
      <CatalogFilters categories={categories} filters={filters} onChange={setFilters} />

      {productsQuery.isError ? (
        <Alert tone="error">
          <p>{productsQuery.error.message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void productsQuery.refetch()}>Intentar nuevamente</Button>
        </Alert>
      ) : productsQuery.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[420px] animate-pulse rounded-[2rem] bg-white" />)}
        </div>
      ) : productsQuery.data?.length ? (
        <ProductGrid products={productsQuery.data} />
      ) : (
        <EmptyState title="No encontramos productos con esos filtros" description="Ajusta la búsqueda o vuelve a ver todos los productos activos del catálogo." action={<Link to="/productos"><Button>Ver catálogo completo</Button></Link>} />
      )}
    </div>
  )
}
