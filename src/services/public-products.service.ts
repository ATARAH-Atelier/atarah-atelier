import { getMadeToOrderNotice } from '../lib/public-utils'
import { supabase } from '../lib/supabase'
import { normalizeNumber } from '../lib/utils'
import type { PublicProduct, PublicProductDetail, PublicProductFilters } from '../types/catalog'
import type { ProductColorRow, ProductImageRow, ProductRow, ProductSizeRow } from '../types/database'

interface PublicProductRow extends ProductRow {
  product_colors?: ProductColorRow[] | null
  product_images?: ProductImageRow[] | null
  product_sizes?: ProductSizeRow[] | null
}

function getCategoryPriority(category: string) {
  const normalizedCategory = category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalizedCategory.includes('mujer') || normalizedCategory.includes('dama') || normalizedCategory.includes('femen')) {
    return 0
  }

  if (normalizedCategory.includes('hombre') || normalizedCategory.includes('caballero') || normalizedCategory.includes('mascul')) {
    return 2
  }

  return 1
}

function mapPublicProduct(row: PublicProductRow): PublicProduct {
  const sizesTop = (row.product_sizes ?? [])
    .filter((size) => size.size_type === 'top')
    .map((size) => ({
      id: size.id,
      price_adjustment: normalizeNumber(size.price_adjustment),
      product_id: size.product_id,
      size: size.size,
      size_type: size.size_type,
    }))

  const sizesBottom = (row.product_sizes ?? [])
    .filter((size) => size.size_type === 'bottom')
    .map((size) => ({
      id: size.id,
      price_adjustment: normalizeNumber(size.price_adjustment),
      product_id: size.product_id,
      size: size.size,
      size_type: size.size_type,
    }))

  const colors = (row.product_colors ?? []).map((color) => ({
    color_hex: color.color_hex ?? '#000000',
    color_name: color.color_name,
    id: color.id,
    price_adjustment: normalizeNumber(color.price_adjustment),
    product_id: color.product_id,
  }))

  const galleryImages = (row.product_images ?? [])
    .map((image) => ({
      color_name: image.color_name ?? null,
      created_at: image.created_at,
      display_order: image.display_order ?? 0,
      id: image.id,
      image_url: image.image_url ?? '',
      product_id: image.product_id,
      storage_path: null,
    }))
    .sort((first, second) => first.display_order - second.display_order)

  const images = galleryImages.length
    ? galleryImages
    : row.image_url
      ? [
          {
            color_name: null,
            created_at: row.created_at,
            display_order: 0,
            id: 'legacy-main-' + row.id,
            image_url: row.image_url,
            product_id: row.id,
            storage_path: null,
          },
        ]
      : []

  const priceAdjustments = [
    ...sizesTop.map((size) => size.price_adjustment),
    ...sizesBottom.map((size) => size.price_adjustment),
    ...colors.map((color) => color.price_adjustment),
  ]

  const basePrice = normalizeNumber(row.base_price)
  const maxAdjustment = priceAdjustments.length ? Math.max(...priceAdjustments, 0) : 0

  return {
    ...row,
    base_price: basePrice,
    category: row.category ?? 'Sin categoria',
    colors,
    estimated_days: row.estimated_days ?? 1,
    images,
    is_active: Boolean(row.is_active),
    is_featured: Boolean(row.is_featured),
    main_image: images[0]?.image_url ?? row.image_url ?? null,
    max_price: basePrice + maxAdjustment,
    min_price: basePrice,
    option_groups: [],
    sizes_bottom: sizesBottom,
    sizes_top: sizesTop,
  }
}

export async function getPublicProducts(filters?: PublicProductFilters): Promise<PublicProduct[]> {
  let query = supabase
    .from('products')
    .select(
      'id, name, slug, description, category, image_url, base_price, estimated_days, is_featured, is_active, created_at, updated_at, product_sizes(id,size,size_type,price_adjustment,product_id), product_colors(id,color_name,color_hex,price_adjustment,product_id), product_images(id,product_id,image_url,color_name,display_order,created_at)',
    )
    .eq('is_active', true)

  if (filters?.search) {
    const term = filters.search.trim()
    query = query.or(`name.ilike.%${term}%,category.ilike.%${term}%`)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.featuredOnly) {
    query = query.eq('is_featured', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error('No fue posible cargar el catalogo.')
  }

  let products = (data ?? []).map((row) => mapPublicProduct(row as PublicProductRow))

  switch (filters?.sort) {
    case 'price_asc':
      products = products.sort((first, second) => first.min_price - second.min_price)
      break
    case 'price_desc':
      products = products.sort((first, second) => second.min_price - first.min_price)
      break
    case 'recent':
      products = products.sort((first, second) =>
        new Date(second.created_at ?? 0).getTime() - new Date(first.created_at ?? 0).getTime(),
      )
      break
    case 'recommended':
    default:
      products = products.sort((first, second) => {
        if (first.is_featured !== second.is_featured) {
          return Number(second.is_featured) - Number(first.is_featured)
        }

        return new Date(second.created_at ?? 0).getTime() - new Date(first.created_at ?? 0).getTime()
      })
  }

  return products.sort((first, second) => getCategoryPriority(first.category) - getCategoryPriority(second.category))
}

export async function getPublicProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, slug, description, category, image_url, base_price, estimated_days, is_featured, is_active, created_at, updated_at, product_sizes(id,size,size_type,price_adjustment,product_id), product_colors(id,color_name,color_hex,price_adjustment,product_id), product_images(id,product_id,image_url,color_name,display_order,created_at)',
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new Error('No fue posible cargar el producto.')
  }

  if (!data) {
    return null
  }

  return {
    ...mapPublicProduct(data as PublicProductRow),
    order_notice: getMadeToOrderNotice(),
  }
}

export async function getPublicProductCategories() {
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null)

  if (error) {
    throw new Error('No fue posible cargar las categorias del catalogo.')
  }

  return Array.from(new Set((data ?? []).map((row) => row.category).filter((category): category is string => Boolean(category))))
    .sort((first, second) =>
      getCategoryPriority(first) - getCategoryPriority(second) || first.localeCompare(second, 'es'),
    )
}



