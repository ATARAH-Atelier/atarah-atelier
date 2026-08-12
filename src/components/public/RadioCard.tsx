import { cn } from '../../lib/utils'

export function RadioCard({
  checked,
  description,
  label,
  onClick,
}: {
  checked: boolean
  description?: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border px-4 py-3 text-left transition',
        checked
          ? 'border-atarah-wine-900 bg-atarah-cream-100 text-atarah-wine-900'
          : 'border-atarah-gold-300 bg-white text-atarah-charcoal-700 hover:bg-atarah-cream-100',
      )}
    >
      <p className="font-semibold">{label}</p>
      {description ? <p className="mt-1 text-sm">{description}</p> : null}
    </button>
  )
}
