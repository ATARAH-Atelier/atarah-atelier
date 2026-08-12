import { v4 as uuidv4 } from 'uuid'

import { supabase } from '../lib/supabase'
import { normalizeNumber, slugify } from '../lib/utils'
import type {
  AdminProductFilters,
  Product,
  ProductCategory,
  ProductCategoryRow,
  ProductColor,
  ProductColorRow,
  ProductCreateInput,
  ProductFormImage,
  ProductImage,
  ProductImageRow,
  ProductRow,
  ProductSize,
  ProductSizeRow,
  ProductUpdateInput,
} from '../types/database'

const PRODUCT_IMAGE_BUCKET = 'Atarah'
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 20

interface ProductQueryRow extends ProductRow {
  product_colors?: ProductColorRow[] | null
  product_images?: ProductImageRow[] | null
  product_sizes?: ProductSizeRow[] | null
}

interface ProductRpcPayload {
  p_base_price: number
  p_category: string
  p_category_id: string | null
  p_colors: Array<{ color_hex: string; color_name: string; price_adjustment: number }>
  p_description: string | null
  p_estimated_days: number
  p_is_active: boolean
  p_is_featured: boolean
  p_name: string
  p_sizes_bottom: Array<{ price_adjustment: number; size: string }>
  p_sizes_top: Array<{ price_adjustment: number; size: string }>
  p_slug: string
}

function getStoragePublicBaseUrl() {
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl('')
  return data.publicUrl.replace(/\/$/, '')
}

function deriveStoragePathFromUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) {
    return null
  }

  const publicBaseUrl = getStoragePublicBaseUrl()

  if (imageUrl.startsWith(`${publicBaseUrl}/`)) {
    return imageUrl.replace(`${publicBaseUrl}/`, '')
  }

  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`
  const markerIndex = imageUrl.indexOf(marker)

  if (markerIndex === -1) {
    return null
  }

  return imageUrl.slice(markerIndex + marker.length)
}

function sanitizeFileName(fileName: string) {
  const extension = fileName.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
    : 'jpg'

  const name = fileName.includes('.')
    ? fileName.slice(0, fileName.lastIndexOf('.'))
    : fileName

  const safeName = slugify(name) || 'imagen-producto'

  return `${safeName}.${extension}`
}

function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Solo se permiten imÃ¡genes JPG, PNG o WEBP.')
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Cada imagen debe pesar 5 MB o menos.')
  }
}

function mapProductSize(row: ProductSizeRow): ProductSize {
  return {
    id: row.id,
    price_adjustment: normalizeNumber(row.price_adjustment),
    product_id: row.product_id,
    size: row.size,
    size_type: row.size_type,
  }
}

function mapProductColor(row: ProductColorRow): ProductColor {
  return {
    color_hex: row.color_hex ?? '#000000',
    color_name: row.color_name,
    id: row.id,
    price_adjustment: normalizeNumber(row.price_adjustment),
    product_id: row.product_id,
  }
}

function mapProductImage(row: ProductImageRow): ProductImage {
  return {
    color_name: row.color_name ?? null,
    created_at: row.created_at,
    display_order: row.display_order ?? 0,
    id: row.id,
    image_url: row.image_url ?? '',
    product_id: row.product_id,
    storage_path: deriveStoragePathFromUrl(row.image_url),
  }
}

function mapProduct(row: ProductQueryRow): Product {
  const galleryImages = (row.product_images ?? [])
    .map(mapProductImage)
    .sort((first, second) => first.display_order - second.display_order)

  const images = galleryImages.length
    ? galleryImages
    : row.image_url
      ? [
          {
            color_name: null,
            created_at: row.created_at,
            display_order: 0,
            id: `legacy-main-${row.id}`,
            image_url: row.image_url,
            product_id: row.id,
            storage_path: deriveStoragePathFromUrl(row.image_url),
          },
        ]
      : []

  return {
    base_price: normalizeNumber(row.base_price),
    category: row.category ?? 'Sin categoria',
    category_id: row.category_id ?? null,
    colors: (row.product_colors ?? []).map(mapProductColor),
    created_at: row.created_at,
    description: row.description,
    estimated_days: row.estimated_days ?? 1,
    id: row.id,
    image_url: row.image_url,
    images,
    is_active: Boolean(row.is_active),
    is_featured: Boolean(row.is_featured),
    main_image: images[0]?.image_url ?? row.image_url ?? null,
    name: row.name,
    option_groups: [],
    sizes_bottom: (row.product_sizes ?? []).filter((size) => size.size_type === 'bottom').map(mapProductSize),
    sizes_top: (row.product_sizes ?? []).filter((size) => size.size_type === 'top').map(mapProductSize),
    slug: row.slug,
    updated_at: row.updated_at,
  }
}

function mapCategory(row: ProductCategoryRow): ProductCategory {
  return {
    ...row,
    is_active: Boolean(row.is_active),
  }
}

function translateProductError(error: { code?: string; details?: string; hint?: string; message?: string } | null) {
  const rawMessage = error?.message?.trim() ?? ''
  const details = error?.details?.trim() ?? ''
  const hint = error?.hint?.trim() ?? ''
  const message = rawMessage.toLowerCase()

  if (error?.code === '23505' || message.includes('duplicate key') || message.includes('slug')) {
    return 'Ya existe un producto con este enlace.'
  }

  if (message.includes('product_images') || message.includes('relation')) {
    return 'No se encontr? la tabla o relaci?n product_images en Supabase.'
  }

  if (message.includes('product_categories') || message.includes('category_id')) {
    return 'Debes aplicar la migraci?n de categor?as de productos en Supabase.'
  }

  if (message.includes('fetch') || message.includes('network')) {
    return 'No fue posible conectar con el servidor.'
  }

  if (message.includes('function') && message.includes('create_product_with_options')) {
    return 'Debes ejecutar las funciones SQL de productos en Supabase antes de usar este m?dulo.'
  }

  if (message.includes('function') && message.includes('update_product_with_options')) {
    return 'Debes ejecutar las funciones SQL de productos en Supabase antes de usar este m?dulo.'
  }

  const diagnosticParts = [rawMessage, details, hint].filter(Boolean)

  if (diagnosticParts.length > 0) {
    return `No fue posible guardar el producto. Detalle: ${diagnosticParts.join(' | ')}`
  }

  return 'No fue posible guardar el producto.'
}

function translateStorageError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? ''

  if (message.includes('bucket') && message.includes('not found')) {
    return `El bucket ${PRODUCT_IMAGE_BUCKET} no existe en Supabase Storage.`
  }

  if (message.includes('row-level security') || message.includes('permission')) {
    return `Supabase Storage bloqueÃ³ la subida por permisos del bucket ${PRODUCT_IMAGE_BUCKET}.`
  }

  if (message.includes('mime') || message.includes('content type')) {
    return `El bucket ${PRODUCT_IMAGE_BUCKET} no acepta este tipo de archivo.`
  }

  if (message.includes('size') || message.includes('file too large')) {
    return 'La imagen excede el lÃ­mite permitido en Supabase Storage.'
  }

  if (message.includes('duplicate')) {
    return 'Ya existe un archivo con ese nombre en el bucket.'
  }

  return 'No se pudo subir una de las imÃ¡genes.'
}

function isMissingProductImagesError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? ''
  return message.includes('product_images') || message.includes('relation')
}
function createRpcPayload(input: ProductCreateInput | ProductUpdateInput): ProductRpcPayload {
  return {
    p_base_price: input.base_price,
    p_category: input.category,
    p_category_id: input.category_id || null,
    p_colors: input.colors.map((color) => ({
      color_hex: color.color_hex,
      color_name: color.color_name,
      price_adjustment: color.price_adjustment,
    })),
    p_description: input.description,
    p_estimated_days: input.estimated_days,
    p_is_active: input.is_active,
    p_is_featured: input.is_featured,
    p_name: input.name,
    p_sizes_bottom: input.sizes_bottom.map((size) => ({
      price_adjustment: size.price_adjustment,
      size: size.size,
    })),
    p_sizes_top: input.sizes_top.map((size) => ({
      price_adjustment: size.price_adjustment,
      size: size.size,
    })),
    p_slug: input.slug,
  }
}

async function fetchProductRows(filters?: AdminProductFilters) {
  let query = supabase
    .from('products')
    .select(
      'id, name, slug, description, category, category_id, image_url, base_price, estimated_days, is_featured, is_active, created_at, updated_at, product_sizes(id,size,size_type,price_adjustment,product_id), product_colors(id,color_name,color_hex,price_adjustment,product_id), product_images(id,product_id,image_url,color_name,display_order,created_at)',
    )
    .order('created_at', { ascending: false })

  if (filters?.search) {
    const term = filters.search.trim()
    query = query.or(`name.ilike.%${term}%,category.ilike.%${term}%,slug.ilike.%${term}%`)
  }

  if (typeof filters?.is_active === 'boolean') {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  } else if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(translateProductError(error))
  }

  return (data ?? []) as ProductQueryRow[]
}

export async function getActiveProducts(): Promise<Product[]> {
  return getAdminProducts({ is_active: true })
}

export async function getAdminProducts(filters?: AdminProductFilters): Promise<Product[]> {
  const rows = await fetchProductRows(filters)
  return rows.map(mapProduct)
}

export async function getProductById(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, slug, description, category, category_id, image_url, base_price, estimated_days, is_featured, is_active, created_at, updated_at, product_sizes(id,size,size_type,price_adjustment,product_id), product_colors(id,color_name,color_hex,price_adjustment,product_id), product_images(id,product_id,image_url,color_name,display_order,created_at)',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(translateProductError(error))
  }

  if (!data) {
    throw new Error('No se encontrÃ³ el producto solicitado.')
  }

  return mapProduct(data as ProductQueryRow)
}

export async function checkSlugExists(slug: string, excludeId?: string) {
  let query = supabase.from('products').select('id', { count: 'exact', head: true }).eq('slug', slug)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { count, error } = await query

  if (error) {
    throw new Error('No fue posible validar el enlace del producto.')
  }

  return (count ?? 0) > 0
}

export async function getProductCategories() {
  const tableQuery = await supabase
    .from('product_categories')
    .select('id, name, slug, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (!tableQuery.error) {
    return (tableQuery.data ?? []).map((row) => mapCategory(row as ProductCategoryRow))
  }

  const { data, error } = await supabase
    .from('products')
    .select('category')
    .not('category', 'is', null)

  if (error) {
    throw new Error('No fue posible consultar las categorÃ­as.')
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.category)
        .filter((category): category is string => Boolean(category?.trim())),
    ),
  )
    .sort((first, second) => first.localeCompare(second, 'es'))
    .map((name) => ({
      created_at: null,
      id: name,
      is_active: true,
      name,
      slug: slugify(name),
      updated_at: null,
    }))
}

export async function uploadProductImage(productId: string, file: File) {
  validateImageFile(file)

  const safeFileName = sanitizeFileName(file.name)
  const path = `products/${productId}/${uuidv4()}-${safeFileName}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(translateStorageError(uploadError))
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)

  return {
    image_url: data.publicUrl,
    storage_path: path,
  }
}

export async function deleteProductImage(pathOrUrl: string) {
  const path = pathOrUrl.includes('http') ? deriveStoragePathFromUrl(pathOrUrl) : pathOrUrl

  if (!path) {
    return
  }

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path])

  if (error) {
    throw new Error(translateStorageError(error))
  }
}

export async function syncProductSizes(productId: string, sizes: ProductSize[], sizeType: 'top' | 'bottom') {
  const { error: deleteError } = await supabase.from('product_sizes').delete().eq('product_id', productId).eq('size_type', sizeType)

  if (deleteError) {
    throw new Error('No fue posible sincronizar las tallas del producto.')
  }

  if (!sizes.length) {
    return
  }

  const { error: insertError } = await supabase.from('product_sizes').insert(
    sizes.map((size) => ({
      price_adjustment: size.price_adjustment,
      product_id: productId,
      size: size.size,
      size_type: sizeType,
    })),
  )

  if (insertError) {
    throw new Error('No fue posible sincronizar las tallas del producto.')
  }
}

export async function syncProductColors(productId: string, colors: ProductColor[]) {
  const { error: deleteError } = await supabase.from('product_colors').delete().eq('product_id', productId)

  if (deleteError) {
    throw new Error('No fue posible sincronizar los colores del producto.')
  }

  if (!colors.length) {
    return
  }

  const { error: insertError } = await supabase.from('product_colors').insert(
    colors.map((color) => ({
      color_hex: color.color_hex,
      color_name: color.color_name,
      price_adjustment: color.price_adjustment,
      product_id: productId,
    })),
  )

  if (insertError) {
    throw new Error('No fue posible sincronizar los colores del producto.')
  }
}

async function insertProductImages(productId: string, images: Array<{ color_name: string | null; display_order: number; image_url: string }>) {
  if (!images.length) {
    return [] as ProductImage[]
  }

  const { data, error } = await supabase
    .from('product_images')
    .insert(
      images.map((image) => ({
        color_name: image.color_name ?? null,
        display_order: image.display_order,
        image_url: image.image_url,
        product_id: productId,
      })),
    )
    .select('id, product_id, image_url, color_name, display_order, created_at')

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapProductImage(row as ProductImageRow))
}

async function updateProductMainImage(productId: string, mainImageUrl: string | null) {
  const { error } = await supabase
    .from('products')
    .update({ image_url: mainImageUrl, updated_at: new Date().toISOString() })
    .eq('id', productId)

  if (error) {
    throw new Error('No fue posible actualizar la imagen principal del producto.')
  }
}

export async function syncProductImages(productId: string, images: ProductFormImage[], existingImages: ProductImage[]) {
  if (images.length > MAX_IMAGES) {
    throw new Error(`Solo puedes guardar hasta ${MAX_IMAGES} imÃ¡genes por producto.`)
  }

  const keptExistingIds = new Set(
    images
      .filter((image) => !image.isNew && !image.markedForDeletion && image.id)
      .map((image) => image.id as string),
  )

  const imagesToDelete = existingImages.filter((image) => !keptExistingIds.has(image.id))

  for (const image of imagesToDelete) {
    if (image.storage_path) {
      await deleteProductImage(image.storage_path)
    }
  }

  let supportsGalleryTable = true

  if (imagesToDelete.length) {
    const { error: deleteRowsError } = await supabase
      .from('product_images')
      .delete()
      .in('id', imagesToDelete.map((image) => image.id))

    if (deleteRowsError) {
      if (isMissingProductImagesError(deleteRowsError)) {
        supportsGalleryTable = false
      } else {
        throw new Error('No fue posible actualizar las imÃ¡genes del producto.')
      }
    }
  }

  const newImages = images.filter(
    (image): image is ProductFormImage & { file: File } => Boolean(image.isNew && image.file && !image.markedForDeletion),
  )

  const uploadedImageAssets = [] as Array<{ color_name: string | null; display_order: number; image_url: string; storage_path: string | null }>

  for (const [index, image] of newImages.entries()) {
    const uploadedImage = await uploadProductImage(productId, image.file)
    uploadedImageAssets.push({
      color_name: image.color_name ?? null,
      display_order: index,
      image_url: uploadedImage.image_url,
      storage_path: uploadedImage.storage_path,
    })
  }

  const uploadedNewImages: ProductImage[] = []

  if (uploadedImageAssets.length && supportsGalleryTable) {
    try {
      const inserted = await insertProductImages(
        productId,
        uploadedImageAssets.map((image) => ({
          color_name: image.color_name,
          display_order: image.display_order,
          image_url: image.image_url,
        })),
      )
      uploadedNewImages.push(...inserted)
    } catch (error) {
      if (isMissingProductImagesError(error as { message?: string })) {
        supportsGalleryTable = false
      } else {
        throw new Error(translateProductError(error as { message?: string; details?: string; hint?: string; code?: string } | null))
      }
    }
  }

  const existingMap = new Map(existingImages.map((image) => [image.id, image]))

  if (!supportsGalleryTable) {
    const uploadedQueue = [...uploadedImageAssets]
    const fallbackImages = images
      .filter((image) => !image.markedForDeletion)
      .map((image, index) => {
        if (image.isNew) {
          const uploaded = uploadedQueue.shift()
          if (!uploaded) {
            return null
          }

          return {
            color_name: uploaded.color_name,
            created_at: new Date().toISOString(),
            display_order: index,
            id: `fallback-${index}`,
            image_url: uploaded.image_url,
            product_id: productId,
            storage_path: uploaded.storage_path,
          } satisfies ProductImage
        }

        return image.id ? existingMap.get(image.id) ?? null : null
      })
      .filter((image): image is ProductImage => Boolean(image))

    await updateProductMainImage(productId, fallbackImages[0]?.image_url ?? null)

    return fallbackImages
  }

  const insertedQueue = [...uploadedNewImages]
  const orderedImages = images
    .filter((image) => !image.markedForDeletion)
    .map((image) => {
      if (image.isNew) {
        return insertedQueue.shift() ?? null
      }

      return image.id ? existingMap.get(image.id) ?? null : null
    })
    .filter((image): image is ProductImage => Boolean(image))

  for (const [index, image] of orderedImages.entries()) {
    const { error } = await supabase
      .from('product_images')
      .update({ color_name: image.color_name ?? null, display_order: index })
      .eq('id', image.id)

    if (error) {
      if (isMissingProductImagesError(error)) {
        supportsGalleryTable = false
        break
      }

      throw new Error('No fue posible actualizar el orden de las imÃ¡genes.')
    }
  }

  if (!supportsGalleryTable) {
    await updateProductMainImage(productId, orderedImages[0]?.image_url ?? null)
    return orderedImages
  }

  await updateProductMainImage(productId, orderedImages[0]?.image_url ?? null)

  return orderedImages
}

export async function setProductActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error('No fue posible actualizar el estado del producto.')
  }
}

export async function setProductFeatured(id: string, isFeatured: boolean) {
  const { error } = await supabase
    .from('products')
    .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error('No fue posible actualizar el destacado del producto.')
  }
}

export async function createProduct(input: ProductCreateInput) {
  const { data, error } = await supabase.rpc('create_product_with_options', createRpcPayload(input))

  if (error) {
    throw new Error(translateProductError(error))
  }

  const rpcProduct = Array.isArray(data) ? data[0] : data

  if (!rpcProduct?.id) {
    throw new Error('No fue posible guardar el producto. La funci?n SQL create_product_with_options no devolvi? el id del producto.')
  }

  try {
    await syncProductImages(rpcProduct.id, input.images, [])
    return await getProductById(rpcProduct.id)
  } catch (error) {
    await supabase.from('products').delete().eq('id', rpcProduct.id)
    throw error instanceof Error ? error : new Error('No fue posible guardar el producto.')
  }
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  const { data, error } = await supabase.rpc('update_product_with_options', {
    p_product_id: id,
    ...createRpcPayload(input),
  })

  if (error) {
    throw new Error(translateProductError(error))
  }

  const rpcProduct = Array.isArray(data) ? data[0] : data

  if (!rpcProduct?.id) {
    throw new Error('No fue posible guardar el producto. La funci?n SQL update_product_with_options no devolvi? el id del producto.')
  }

  await syncProductImages(rpcProduct.id, input.images, input.existingImages)

  return await getProductById(rpcProduct.id)
}


