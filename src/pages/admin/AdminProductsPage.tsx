import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, ImageOff, Package, Pencil, Plus, Power, Search, SlidersHorizontal, Star, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatCurrency, formatDate } from '../../lib/utils'
import { getAdminProducts, getProductCategories, setProductActive, setProductFeatured } from '../../services/products.service'
import type { Product } from '../../types/database'

export function AdminProductsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [productToToggle, setProductToToggle] = useState<Product | null>(null)
  const queryClient = useQueryClient()

  useDocumentTitle('Productos | Atarah Atelier')

  const filters = useMemo(
    () => ({
      category_id: categoryFilter === 'all' ? undefined : categoryFilter,
      is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
      search: search.trim() || undefined,
    }),
    [categoryFilter, search, statusFilter],
  )

  const productsQuery = useQuery({
    queryFn: () => getAdminProducts(filters),
    queryKey: ['admin-products', filters],
  })

  const categoriesQuery = useQuery({
    queryFn: getProductCategories,
    queryKey: ['admin-product-categories'],
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setProductActive(id, isActive),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      void queryClient.invalidateQueries({ queryKey: ['home-featured-products'] })
      toast.success(variables.isActive ? 'Producto activado correctamente.' : 'Producto desactivado correctamente.')
      setProductToToggle(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el estado del producto.')
    },
  })

  const featuredMutation = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) => setProductFeatured(id, isFeatured),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      void queryClient.invalidateQueries({ queryKey: ['home-featured-products'] })
      toast.success(variables.isFeatured ? 'Producto destacado en la página principal.' : 'Producto quitado de prendas destacadas.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el destacado del producto.')
    },
  })

  const products = productsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const totalProducts = products.length
  const isTogglingActiveProduct = productToToggle?.is_active ?? false
  const toggleDialogTitle = isTogglingActiveProduct ? 'Desactivar producto' : 'Activar producto'
  const toggleDialogDescription = isTogglingActiveProduct ? 'El producto dejará de mostrarse en el catálogo público.' : 'El producto volverá a estar disponible en el catálogo público.'
  const toggleDialogConfirmLabel = isTogglingActiveProduct ? 'Desactivar' : 'Activar'
  const toggleDialogTone = isTogglingActiveProduct ? 'danger' : 'default'

  return (
    <div className="space-y-8">
      <PageHeader
        title="Catálogo de productos"
        description="Gestiona tu inventario, precios, variantes y visibilidad en la tienda."
        action={
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/categorias">
              <Button variant="outline">Categorías</Button>
            </Link>
            <Link to="/admin/productos/nuevo">
              <Button leftIcon={<Plus className="size-4" />}>Nuevo producto</Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-col gap-4 rounded-3xl border border-atarah-gold-200/60 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-atarah-charcoal-400" />
          <Input id="product-search" placeholder="Buscar por nombre, categoría o slug" className="pl-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <SlidersHorizontal className="hidden size-4 text-atarah-charcoal-500 md:block" />
          <Select id="product-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="w-full sm:min-w-[160px]">
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </Select>
          <Select id="product-category-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:min-w-[200px]">
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          {(search || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all') }}>
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {productsQuery.isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
          <p className="font-medium">Error al cargar los productos</p>
          <p className="mt-1 text-sm">{productsQuery.error.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => productsQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : productsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-white shadow-sm" />)}
        </div>
      ) : totalProducts === 0 ? (
        <EmptyState
          icon={Package}
          title="No se encontraron productos"
          description={filters.search || categoryFilter !== 'all' || statusFilter !== 'all' ? 'Ajusta los filtros para ver más resultados.' : 'Crea el primer producto del catálogo para comenzar a vender.'}
          action={
            <Link to="/admin/productos/nuevo">
              <Button leftIcon={<Plus className="size-4" />}>Crear producto</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-atarah-charcoal-600">
            <p>
              Mostrando <span className="font-semibold text-atarah-charcoal-900">{totalProducts}</span> {totalProducts === 1 ? 'producto' : 'productos'}
            </p>
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-atarah-gold-200 bg-white shadow-sm 2xl:block">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-atarah-gold-200 text-left text-xs font-semibold uppercase tracking-wider text-atarah-charcoal-500">
                  <th className="py-4 pl-6">Producto</th>
                  <th className="py-4">Categoría</th>
                  <th className="py-4">Precio base</th>
                  <th className="py-4">Confección</th>
                  <th className="py-4">Estado</th>
                  <th className="py-4">Creado</th>
                  <th className="py-4 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atarah-gold-100">
                {products.map((product) => (
                  <tr key={product.id} className="group transition-colors hover:bg-atarah-cream-50/70">
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-atarah-cream-100 ring-1 ring-atarah-gold-200/50">
                          {product.main_image ? <img src={product.main_image} alt={product.name} className="h-full w-full object-cover" /> : <ImageOff className="size-5 text-atarah-charcoal-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-atarah-charcoal-900">{product.name}</p>
                          <p className="truncate text-xs text-atarah-charcoal-500">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm">
                      <span className="inline-flex items-center rounded-full bg-atarah-cream-100 px-3 py-1 text-xs font-medium text-atarah-charcoal-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-4 text-sm font-medium">{formatCurrency(product.base_price)}</td>
                    <td className="py-4 text-sm">{product.estimated_days} días</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-atarah-cream-100 text-atarah-charcoal-600'}`}>
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {product.is_featured && <Tag className="size-4 text-atarah-gold-600" />}
                      </div>
                    </td>
                    <td className="py-4 text-sm text-atarah-charcoal-600">{formatDate(product.created_at)}</td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/productos/${product.id}/editar`}>
                          <Button variant="ghost" size="sm" leftIcon={<Pencil className="size-4" />}>Editar</Button>
                        </Link>
                        <Button variant={product.is_featured ? 'ghost' : 'outline'} size="sm" leftIcon={<Star className="size-4" />} loading={featuredMutation.isPending} onClick={() => featuredMutation.mutate({ id: product.id, isFeatured: !product.is_featured })}>
                          {product.is_featured ? 'Quitar destacado' : 'Destacar en inicio'}
                        </Button>
                        <Button variant="ghost" size="sm" leftIcon={<Power className="size-4" />} onClick={() => setProductToToggle(product)}>
                          {product.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        {product.slug && (
                          <a href={`/productos/${product.slug}`} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" leftIcon={<ExternalLink className="size-4" />}>Ver</Button>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:hidden">
            {products.map((product) => (
              <article key={product.id} className="group rounded-3xl border border-atarah-gold-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-atarah-cream-100 ring-1 ring-atarah-gold-200/50">
                    {product.main_image ? <img src={product.main_image} alt={product.name} className="h-full w-full object-cover" /> : <ImageOff className="size-5 text-atarah-charcoal-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-atarah-charcoal-900">{product.name}</p>
                        <p className="text-sm text-atarah-charcoal-600">{product.category}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-atarah-cream-100 text-atarah-charcoal-600'}`}>
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <p className="text-atarah-charcoal-600">Precio</p>
                      <p className="font-medium">{formatCurrency(product.base_price)}</p>
                      <p className="text-atarah-charcoal-600">Confección</p>
                      <p>{product.estimated_days} días</p>
                      <p className="text-atarah-charcoal-600">Creado</p>
                      <p className="text-xs">{formatDate(product.created_at)}</p>
                    </div>
                    {product.is_featured && (
                      <div className="mt-2 flex items-center gap-2 text-atarah-gold-700">
                        <Tag className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.14em]">Destacado</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-atarah-gold-200 pt-3">
                  <Link to={`/admin/productos/${product.id}/editar`}>
                    <Button variant="outline" size="sm" leftIcon={<Pencil className="size-4" />}>Editar</Button>
                  </Link>
                  <Button variant={product.is_featured ? 'ghost' : 'outline'} size="sm" leftIcon={<Star className="size-4" />} loading={featuredMutation.isPending} onClick={() => featuredMutation.mutate({ id: product.id, isFeatured: !product.is_featured })}>
                    {product.is_featured ? 'Quitar destacado' : 'Destacar'}
                  </Button>
                  <Button variant="outline" size="sm" leftIcon={<Power className="size-4" />} onClick={() => setProductToToggle(product)}>
                    {product.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  {product.slug && (
                    <a href={`/productos/${product.slug}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" leftIcon={<ExternalLink className="size-4" />}>Ver</Button>
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(productToToggle)}
        title={toggleDialogTitle}
        description={toggleDialogDescription}
        confirmLabel={toggleDialogConfirmLabel}
        tone={toggleDialogTone}
        onCancel={() => setProductToToggle(null)}
        onConfirm={() => {
          if (!productToToggle) return
          toggleMutation.mutate({ id: productToToggle.id, isActive: !productToToggle.is_active })
        }}
      />
    </div>
  )
}


