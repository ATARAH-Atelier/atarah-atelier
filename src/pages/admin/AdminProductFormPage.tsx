import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '../../components/common/EmptyState'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { ProductForm } from '../../features/products/components/ProductForm'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { createProduct, getProductById, updateProduct } from '../../services/products.service'
import type { Product, ProductCreateInput, ProductFormValues } from '../../types/database'

interface AdminProductFormPageProps {
  mode: 'create' | 'edit'
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeProductInput(values: ProductFormValues): ProductCreateInput {
  const validColorNames = new Set(values.colors.map((color) => color.color_name.trim().toLowerCase()))
  const normalizedCategoryId = UUID_PATTERN.test(values.category_id) ? values.category_id : ''

  return {
    base_price: values.base_price,
    category: values.category,
    category_id: normalizedCategoryId,
    colors: values.colors,
    description: values.description.trim() || null,
    estimated_days: values.estimated_days,
    images: values.images.map((image) => ({
      ...image,
      color_name: image.color_name && validColorNames.has(image.color_name.trim().toLowerCase()) ? image.color_name.trim() : null,
    })),
    is_active: values.is_active,
    is_featured: values.is_featured,
    name: values.name.trim(),
    sizes_top: values.sizes_top,
    sizes_bottom: values.sizes_bottom,
    slug: values.slug.trim(),
  }
}

export function AdminProductFormPage({ mode }: AdminProductFormPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams()

  useDocumentTitle(mode === 'create' ? 'Nuevo producto | Atarah Atelier' : 'Editar producto | Atarah Atelier')

  const productQuery = useQuery({
    enabled: mode === 'edit' && Boolean(params.id),
    queryFn: () => getProductById(params.id as string),
    queryKey: ['admin-product', params.id],
  })

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      toast.success('Producto creado correctamente.')
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] })
      navigate('/admin/productos', { replace: true })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el producto.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductCreateInput & { existingImages: Product['images'] } }) => updateProduct(id, input),
    onSuccess: async () => {
      toast.success('Producto actualizado correctamente.')
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] })
      if (params.id) {
        await queryClient.invalidateQueries({ queryKey: ['admin-product', params.id] })
      }
      navigate('/admin/productos', { replace: true })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el producto.')
    },
  })

  async function handleSubmit(values: ProductFormValues, existingImages: Product['images']) {
    const input = normalizeProductInput(values)

    if (mode === 'create') {
      await createMutation.mutateAsync(input)
      return
    }

    if (!params.id) {
      throw new Error('No se encontró el producto a editar.')
    }

    await updateMutation.mutateAsync({
      id: params.id,
      input: {
        ...input,
        existingImages,
      },
    })
  }

  if (mode === 'edit' && productQuery.isLoading) {
    return <LoadingScreen message="Cargando producto..." />
  }

  if (mode === 'edit' && productQuery.isError) {
    return <EmptyState title="No se pudo cargar el producto" description={productQuery.error.message} />
  }

  return (
    <ProductForm
      mode={mode}
      product={productQuery.data}
      cancelHref="/admin/productos"
      onCancel={() => navigate('/admin/productos')}
      onSubmit={handleSubmit}
      submitLabel={mode === 'create' ? 'Guardar producto' : 'Guardar cambios'}
    />
  )
}