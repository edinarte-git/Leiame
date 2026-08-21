import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  fullWidth?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'relative isolate overflow-hidden bg-gradient-to-b from-accent-2 to-accent text-bg shadow-[0_8px_20px_-8px_color-mix(in_srgb,var(--color-accent)_70%,transparent)] before:absolute before:inset-x-2 before:top-0 before:h-1/2 before:rounded-full before:bg-white/25 before:blur-[3px] before:content-[""] hover:shadow-[0_10px_24px_-6px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] hover:brightness-105 active:scale-[0.97] active:shadow-[0_4px_12px_-6px_color-mix(in_srgb,var(--color-accent)_70%,transparent)]',
  secondary:
    'border border-border bg-surface-2/60 text-text hover:border-accent/50 hover:bg-surface-2 active:scale-[0.97]',
  ghost:
    'bg-transparent text-text-muted decoration-accent decoration-2 underline-offset-4 hover:text-text hover:underline active:scale-[0.97]',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20 active:scale-[0.97]',
}

export function Button({
  children,
  variant = 'primary',
  fullWidth,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
