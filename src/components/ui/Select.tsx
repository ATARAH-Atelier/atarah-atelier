import type { SelectHTMLAttributes } from 'react'

import { cn } from '../../lib/utils'
import { Label } from './Label'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  helperText?: string
  label?: string
}

export function Select({
  children,
  className,
  error,
  helperText,
  id,
  label,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <select
        id={id}
        className={cn(
          'flex h-12 w-full rounded-2xl border bg-white px-4 text-sm text-atarah-charcoal-900 outline-none transition focus-visible:ring-4',
          error
            ? 'border-rose-300 focus-visible:ring-rose-100'
            : 'border-atarah-gold-300 focus-visible:border-atarah-wine-700 focus-visible:ring-atarah-gold-300/40',
          className,
        )}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="mt-2 text-sm text-atarah-charcoal-600">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
