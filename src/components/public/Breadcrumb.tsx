import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface BreadcrumbItem {
  href?: string
  label: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-atarah-charcoal-600">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? <Link to={item.href} className="hover:text-atarah-wine-900">{item.label}</Link> : <span className="font-medium text-atarah-wine-900">{item.label}</span>}
          {index < items.length - 1 ? <ChevronRight className="size-4" aria-hidden="true" /> : null}
        </div>
      ))}
    </nav>
  )
}
