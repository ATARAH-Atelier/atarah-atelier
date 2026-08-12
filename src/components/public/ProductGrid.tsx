import type { PublicProduct } from '../../types/catalog'
import { ProductCard } from './ProductCard'

export function ProductGrid({ products }: { products: PublicProduct[] }) {
  return <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
}
