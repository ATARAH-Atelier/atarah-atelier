import { supabase } from '../lib/supabase'
import { slugify } from '../lib/utils'
import type { ProductCategory, ProductCategoryInput, ProductCategoryRow } from '../types/database'

function mapCategory(row: ProductCategoryRow): ProductCategory {
  return {
    ...row,
    is_active: Boolean(row.is_active),
  }
}

function translateCategoryError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? ''

  if (message.includes('product_categories') || message.includes('relation')) {
    return 'Debes aplicar la migración de categorías de productos en Supabase.'
  }

  if (message.includes('duplicate') || message.includes('unique')) {
    return 'Ya existe una categoría con ese nombre o slug.'
  }

  return 'No fue posible guardar la categoría.'
}

export async function getAdminCategories() {
  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name, slug, is_active, created_at, updated_at')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(translateCategoryError(error))
  }

  return (data ?? []).map((row) => mapCategory(row as ProductCategoryRow))
}

export async function createCategory(input: ProductCategoryInput) {
  const payload = {
    is_active: input.is_active,
    name: input.name.trim(),
    slug: slugify(input.slug.trim() || input.name.trim()),
  }

  const { data, error } = await supabase
    .from('product_categories')
    .insert(payload)
    .select('id, name, slug, is_active, created_at, updated_at')
    .maybeSingle()

  if (error || !data) {
    throw new Error(translateCategoryError(error))
  }

  return mapCategory(data as ProductCategoryRow)
}

export async function updateCategory(id: string, input: ProductCategoryInput) {
  const payload = {
    is_active: input.is_active,
    name: input.name.trim(),
    slug: slugify(input.slug.trim() || input.name.trim()),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('product_categories')
    .update(payload)
    .eq('id', id)
    .select('id, name, slug, is_active, created_at, updated_at')
    .maybeSingle()

  if (error || !data) {
    throw new Error(translateCategoryError(error))
  }

  return mapCategory(data as ProductCategoryRow)
}

export async function setCategoryActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from('product_categories')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(translateCategoryError(error))
  }
}
