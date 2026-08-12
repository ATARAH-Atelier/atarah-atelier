import { Minus, Plus } from 'lucide-react'

interface QuantitySelectorProps {
  max?: number
  min?: number
  onChange: (value: number) => void
  value: number
}

export function QuantitySelector({ max = 20, min = 1, onChange, value }: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-2xl border border-atarah-gold-300 bg-white">
      <button type="button" className="p-3 text-atarah-wine-900 disabled:opacity-50" aria-label="Disminuir cantidad" disabled={value <= min} onClick={() => onChange(Math.max(value - 1, min))}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="min-w-10 text-center text-sm font-semibold">{value}</span>
      <button type="button" className="p-3 text-atarah-wine-900 disabled:opacity-50" aria-label="Aumentar cantidad" disabled={value >= max} onClick={() => onChange(Math.min(value + 1, max))}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
