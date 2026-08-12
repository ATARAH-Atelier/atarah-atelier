import { cn } from '../../lib/utils'

export function ColorSwatch({ color, label, selected, onClick }: { color: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition', selected ? 'border-atarah-wine-900 bg-atarah-cream-100' : 'border-atarah-gold-300 bg-white hover:bg-atarah-cream-100')}>
      <span className="size-5 rounded-full border border-atarah-gold-300" style={{ backgroundColor: color }} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
