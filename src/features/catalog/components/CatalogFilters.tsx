import { Search } from 'lucide-react'

import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import type { PublicProductFilters } from '../../../types/catalog'

interface CatalogFiltersProps {
  categories: string[]
  filters: PublicProductFilters
  onChange: (filters: PublicProductFilters) => void
}

export function CatalogFilters({ categories, filters, onChange }: CatalogFiltersProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_220px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-4 size-4 text-atarah-charcoal-600" />
        <Input
          id="catalog-search"
          placeholder="Buscar por nombre o categoría"
          className="pl-11"
          value={filters.search ?? ''}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </div>
      <Select id="catalog-category" value={filters.category ?? 'all'} onChange={(event) => onChange({ ...filters, category: event.target.value === 'all' ? undefined : event.target.value })}>
        <option value="all">Todas las categorías</option>
        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
      </Select>
      <Select id="catalog-featured" value={filters.featuredOnly ? 'featured' : 'all'} onChange={(event) => onChange({ ...filters, featuredOnly: event.target.value === 'featured' })}>
        <option value="all">Todos</option>
        <option value="featured">Solo destacados</option>
      </Select>
      <Select id="catalog-sort" value={filters.sort ?? 'recommended'} onChange={(event) => onChange({ ...filters, sort: event.target.value as PublicProductFilters['sort'] })}>
        <option value="recommended">Recomendados</option>
        <option value="price_asc">Precio menor</option>
        <option value="price_desc">Precio mayor</option>
        <option value="recent">Más recientes</option>
      </Select>
    </div>
  )
}
