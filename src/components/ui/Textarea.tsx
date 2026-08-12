import type { TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'

import { cn } from '../../lib/utils'
import { Label } from './Label'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  helperText?: string
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, id, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label ? <Label htmlFor={id}>{label}</Label> : null}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'flex min-h-32 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-atarah-charcoal-900 outline-none transition placeholder:text-atarah-charcoal-600/70 focus-visible:ring-4',
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
        />
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
  },
)

Textarea.displayName = 'Textarea'
