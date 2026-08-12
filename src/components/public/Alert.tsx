import { cn } from '../../lib/utils'

export function Alert({
  children,
  className,
  tone = 'info',
}: {
  children: React.ReactNode
  className?: string
  tone?: 'error' | 'info' | 'success'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm',
        tone === 'error' && 'border-rose-200 bg-rose-50 text-rose-800',
        tone === 'info' && 'border-atarah-gold-300 bg-atarah-cream-100 text-atarah-charcoal-700',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        className,
      )}
    >
      {children}
    </div>
  )
}
