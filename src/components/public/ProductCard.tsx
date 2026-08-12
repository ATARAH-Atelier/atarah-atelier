import { ImageOff } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { PublicProduct } from '../../types/catalog'
import { formatCurrency } from '../../lib/utils'

export function ProductCard({ product }: { product: PublicProduct }) {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-atarah-gold-300/70 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="aspect-[4/4.5] overflow-hidden bg-atarah-cream-100">
        {product.main_image ? (
          <img src={product.main_image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-atarah-charcoal-600">
            <ImageOff className="size-8" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-atarah-cream-100 px-3 py-1 text-xs font-semibold text-atarah-wine-900">{product.category}</span>
          {product.is_featured ? <span className="inline-flex rounded-full bg-atarah-gold-300/60 px-3 py-1 text-xs font-semibold text-atarah-wine-950">Destacado</span> : null}
        </div>
        <div>
          <h3 className="font-display text-3xl font-bold text-atarah-wine-900">{product.name}</h3>
          <p className="mt-2 text-sm text-atarah-charcoal-600">Confección estimada de {product.estimated_days} días.</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-atarah-charcoal-600">Desde</p>
            <p className="text-lg font-semibold text-atarah-wine-900">{formatCurrency(product.min_price)}</p>
          </div>
          <Link to={`/productos/${product.slug}`} className="inline-flex items-center rounded-full bg-atarah-wine-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-atarah-wine-700">
            <span className="text-white">Ver detalles</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
