import type { ProductColor, ProductImage, ProductSize } from './database'

export interface PublicProduct extends Omit<import('./database').Product, 'colors' | 'images' | 'sizes_bottom' | 'sizes_top'> {
  colors: ProductColor[]
  images: ProductImage[]
  max_price: number
  min_price: number
  sizes_bottom: ProductSize[]
  sizes_top: ProductSize[]
}

export interface PublicProductDetail extends PublicProduct {
  order_notice: string
}

export interface PublicProductFilters {
  category?: string
  featuredOnly?: boolean
  search?: string
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'recent'
}
