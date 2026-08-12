import { useQuery } from '@tanstack/react-query'

import { getPublicProductCategories, getPublicProducts } from '../../../services/public-products.service'
import type { PublicProductFilters } from '../../../types/catalog'

export function usePublicProducts(filters: PublicProductFilters) {
  const productsQuery = useQuery({
    queryFn: () => getPublicProducts(filters),
    queryKey: ['public-products', filters],
  })

  const categoriesQuery = useQuery({
    queryFn: getPublicProductCategories,
    queryKey: ['public-product-categories'],
  })

  return {
    categoriesQuery,
    productsQuery,
  }
}
