import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderTree, Pencil, Plus, Power } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { slugify } from '../../lib/utils'
import { createCategory, getAdminCategories, setCategoryActive, updateCategory } from '../../services/categories.service'
import type { ProductCategory, ProductCategoryInput } from '../../types/database'

type CategoryFormState = ProductCategoryInput

const emptyForm: CategoryFormState = {
  is_active: true,
  name: '',
  slug: '',
}

export function AdminCategoriesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [categoryToToggle, setCategoryToToggle] = useState<ProductCategory | null>(null)
  const [form, setForm] = useState<CategoryFormState>(emptyForm)
  const queryClient = useQueryClient()

  useDocumentTitle('Categorías | Atarah Atelier')

  const categoriesQuery = useQuery({
    queryFn: getAdminCategories,
    queryKey: ['admin-categories'],
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: CategoryFormState) => {
      if (editingCategory) {
        return updateCategory(editingCategory.id, payload)
      }

      return createCategory(payload)
    },
    onSuccess: async () => {
      toast.success(editingCategory ? 'Categoría actualizada.' : 'Categoría creada.')
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] })
      closeModal()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar la categoría.')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setCategoryActive(id, isActive),
    onSuccess: async (_, variables) => {
      toast.success(variables.isActive ? 'Categoría activada.' : 'Categoría desactivada.')
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] })
      setCategoryToToggle(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar la categoría.')
    },
  })

  const summary = useMemo(() => {
    const categories = categoriesQuery.data ?? []
    return {
      active: categories.filter((category) => category.is_active).length,
      total: categories.length,
    }
  }, [categoriesQuery.data])

  function closeModal() {
    setIsModalOpen(false)
    setEditingCategory(null)
    setForm(emptyForm)
  }

  function openCreateModal() {
    setEditingCategory(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  function openEditModal(category: ProductCategory) {
    setEditingCategory(category)
    setForm({
      is_active: category.is_active,
      name: category.name,
      slug: category.slug,
    })
    setIsModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim()) {
      toast.error('Ingresa el nombre de la categoría.')
      return
    }

    await saveMutation.mutateAsync({
      ...form,
      name: form.name.trim(),
      slug: slugify(form.slug.trim() || form.name.trim()),
    })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Categorías"
        description="Organiza el catálogo con categorías reales para que productos, filtros y reportes tengan mejor estructura."
        action={<Button leftIcon={<Plus className="size-4" />} onClick={openCreateModal}>Nueva categoría</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-atarah-charcoal-500">Categorías registradas</p>
          <p className="mt-2 font-display text-4xl font-bold text-atarah-wine-900">{summary.total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-atarah-charcoal-500">Categorías activas</p>
          <p className="mt-2 font-display text-4xl font-bold text-emerald-700">{summary.active}</p>
        </Card>
      </div>

      {categoriesQuery.isError ? (
        <Card className="border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <p className="font-medium">No se pudieron cargar las categorías</p>
          <p className="mt-2 text-sm">{categoriesQuery.error.message}</p>
        </Card>
      ) : categoriesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-white" />)}
        </div>
      ) : (categoriesQuery.data?.length ?? 0) === 0 ? (
        <EmptyState icon={FolderTree} title="Aún no hay categorías" description="Crea la primera categoría para vincularla a tus productos." action={<Button onClick={openCreateModal}>Crear categoría</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(categoriesQuery.data ?? []).map((category) => (
            <Card key={category.id} className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-atarah-charcoal-900">{category.name}</p>
                  <p className="mt-1 text-xs text-atarah-charcoal-500">/{category.slug}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${category.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-atarah-cream-100 text-atarah-charcoal-600'}`}>
                  {category.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" leftIcon={<Pencil className="size-4" />} onClick={() => openEditModal(category)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" leftIcon={<Power className="size-4" />} onClick={() => setCategoryToToggle(category)}>
                  {category.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-atarah-charcoal-900/45 p-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-atarah-wine-900">{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</h2>
                <p className="mt-1 text-sm text-atarah-charcoal-600">Define el nombre visible y el slug que quedará asociado a los productos.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeModal}>Cerrar</Button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Input id="category-name" label="Nombre" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: slugify(event.target.value) }))} />
              <Input id="category-slug" label="Slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} />
              <label className="flex items-center gap-3 rounded-2xl border border-atarah-gold-300 bg-atarah-cream-50 px-4 py-3 text-sm font-medium text-atarah-charcoal-700">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
                Categoría activa para selección en productos
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" loading={saveMutation.isPending}>{editingCategory ? 'Guardar cambios' : 'Crear categoría'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(categoryToToggle)}
        title={categoryToToggle?.is_active ? 'Desactivar categoría' : 'Activar categoría'}
        description={categoryToToggle?.is_active ? 'La categoría dejará de aparecer como opción nueva en el formulario de productos.' : 'La categoría volverá a estar disponible para nuevos productos.'}
        confirmLabel={categoryToToggle?.is_active ? 'Desactivar' : 'Activar'}
        tone={categoryToToggle?.is_active ? 'danger' : 'default'}
        onCancel={() => setCategoryToToggle(null)}
        onConfirm={() => {
          if (!categoryToToggle) return
          toggleMutation.mutate({ id: categoryToToggle.id, isActive: !categoryToToggle.is_active })
        }}
      />
    </div>
  )
}
