import { useQuery } from '@tanstack/react-query'

import { getPublicProductBySlug } from '../../../services/public-products.service'

export function usePublicProduct(slug: string) {
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getPublicProductBySlug(slug),
    queryKey: ['public-product', slug],
  })
}
