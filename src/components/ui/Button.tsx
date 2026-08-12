import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

import { cn } from '../../lib/utils'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  leftIcon?: ReactNode
  loading?: boolean
  rightIcon?: ReactNode
  size?: ButtonSize
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-atarah-wine-900 text-white shadow-sm hover:bg-atarah-wine-800 focus-visible:ring-atarah-gold-300',
  secondary:
    'bg-atarah-gold-300 text-atarah-wine-950 shadow-sm hover:bg-atarah-gold-500/80 focus-visible:ring-atarah-gold-300',
  outline:
    'border border-atarah-gold-300 bg-white text-atarah-wine-900 hover:bg-atarah-cream-100 focus-visible:ring-atarah-gold-300',
  ghost:
    'bg-transparent text-atarah-charcoal-700 hover:bg-atarah-cream-100 focus-visible:ring-atarah-gold-300',
  danger: 'bg-rose-700 text-white shadow-sm hover:bg-rose-800 focus-visible:ring-rose-200',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      leftIcon,
      loading = false,
      rightIcon,
      size = 'md',
      type = 'button',
      variant = 'primary',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? <Spinner className="size-4" /> : leftIcon}
        <span>{children}</span>
        {!loading ? rightIcon : null}
      </button>
    )
  },
)

Button.displayName = 'Button'
