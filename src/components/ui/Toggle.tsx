import type { InputHTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  description?: string
  label: string
}

export function Toggle({
  checked,
  className,
  description,
  disabled,
  id,
  label,
  ...props
}: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start justify-between gap-4 rounded-2xl border border-atarah-gold-300/70 bg-white px-4 py-4 transition',
        disabled ? 'opacity-60' : 'cursor-pointer hover:bg-atarah-cream-100/60',
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-atarah-charcoal-900">{label}</p>
        {description ? (
          <p className="mt-1 text-sm text-atarah-charcoal-600">{description}</p>
        ) : null}
      </div>
      <span className="relative mt-0.5 inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <span className="h-6 w-11 rounded-full bg-atarah-charcoal-600/25 transition peer-checked:bg-atarah-wine-900 peer-focus-visible:ring-4 peer-focus-visible:ring-atarah-gold-300/40" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}
