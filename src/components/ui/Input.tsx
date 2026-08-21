import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Input({ label, id, className = '', ...rest }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <label htmlFor={inputId} className="mb-3 block text-sm">
      <span className="mb-1 block text-text-muted">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none focus:border-accent ${className}`}
        {...rest}
      />
    </label>
  )
}
