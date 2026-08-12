import { useQuery } from '@tanstack/react-query'
import type { UseFormReturn } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { Toggle } from '../../../components/ui/Toggle'
import { getProductCategories } from '../../../services/products.service'
import type { ProductFormValues } from '../../../types/database'

interface ProductGeneralSectionProps {
  form: UseFormReturn<ProductFormValues>
  onResetSlugAutomation: () => void
  onSlugChange: (value: string) => void
  slugChecking: boolean
}

export function ProductGeneralSection({ form, onResetSlugAutomation, onSlugChange, slugChecking }: ProductGeneralSectionProps) {
  const {
    formState: { errors },
    register,
    setValue,
    watch,
  } = form

  const categoriesQuery = useQuery({
    queryFn: getProductCategories,
    queryKey: ['admin-product-categories'],
  })

  const isFeatured = watch('is_featured')
  const isActive = watch('is_active')
  const selectedCategoryId = watch('category_id')
  const selectedCategory = (categoriesQuery.data ?? []).find((category) => category.id === selectedCategoryId) ?? null

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Input id="name" label="Nombre" placeholder="Ej. Conjunto Classic Vinotinto" error={errors.name?.message} {...register('name')} />

      <div>
        <Input
          id="slug"
          label="Slug"
          placeholder="conjunto-classic-vinotinto"
          helperText={slugChecking ? 'Validando disponibilidad...' : 'Usa minúsculas, números y guiones.'}
          error={errors.slug?.message}
          {...register('slug', {
            onChange: (event) => onSlugChange(event.target.value),
          })}
        />
        <button
          type="button"
          className="mt-2 text-sm font-medium text-atarah-wine-900 transition hover:text-atarah-wine-700"
          onClick={onResetSlugAutomation}
        >
          Regenerar desde el nombre
        </button>
      </div>

      <div className="lg:col-span-2">
        <Textarea
          id="description"
          label="Descripción"
          placeholder="Describe materiales, silueta, detalles y recomendaciones."
          error={errors.description?.message}
          {...register('description')}
        />
      </div>

      <div>
        <Select
          id="category_id"
          label="Categoría"
          value={selectedCategoryId}
          error={errors.category_id?.message ?? errors.category?.message}
          helperText={categoriesQuery.data?.length ? undefined : 'Primero debes crear una categoría activa.'}
          onChange={(event) => {
            const nextId = event.target.value
            const nextCategory = (categoriesQuery.data ?? []).find((category) => category.id === nextId) ?? null
            setValue('category_id', nextId, { shouldDirty: true, shouldValidate: true })
            setValue('category', nextCategory?.name ?? '', { shouldDirty: true, shouldValidate: true })
          }}
        >
          <option value="">Selecciona una categoría</option>
          {(categoriesQuery.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <input type="hidden" value={selectedCategory?.name ?? ''} {...register('category')} />
        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-atarah-charcoal-500">
            {categoriesQuery.isLoading ? 'Cargando categorías...' : 'La categoría se usa en filtros y catálogo.'}
          </span>
          <Link to="/admin/categorias" className="font-medium text-atarah-wine-900 hover:text-atarah-wine-700">
            Gestionar categorías
          </Link>
        </div>
      </div>

      <Input
        id="base_price"
        label="Precio base (USD)"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        error={errors.base_price?.message}
        {...register('base_price', { valueAsNumber: true })}
      />

      <Input
        id="estimated_days"
        label="Días estimados de confección"
        type="number"
        min="1"
        max="365"
        step="1"
        placeholder="7"
        error={errors.estimated_days?.message}
        {...register('estimated_days', { valueAsNumber: true })}
      />

      <div className="grid gap-4 lg:col-span-2 md:grid-cols-2">
        <Toggle
          id="is_featured"
          label="Producto destacado"
          description={isFeatured ? 'Este producto aparecerá resaltado dentro del catálogo.' : 'Activa esta opción para resaltarlo visualmente.'}
          checked={isFeatured}
          {...register('is_featured')}
        />
        <Toggle
          id="is_active"
          label="Producto activo"
          description={isActive ? 'El producto está disponible para mostrarse públicamente.' : 'El producto quedará oculto del catálogo público.'}
          checked={isActive}
          {...register('is_active')}
        />
      </div>
    </div>
  )
}
