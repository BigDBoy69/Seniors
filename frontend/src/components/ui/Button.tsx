import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-sans tracking-widest uppercase text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-charcoal text-cream hover:bg-charcoal-500',
        variant === 'secondary' && 'bg-cream text-charcoal border border-charcoal hover:bg-charcoal hover:text-cream',
        variant === 'outline' && 'border border-charcoal text-charcoal hover:bg-charcoal hover:text-cream bg-transparent',
        variant === 'ghost' && 'text-charcoal hover:text-taupe bg-transparent',
        size === 'sm' && 'px-4 py-2 text-2xs',
        size === 'md' && 'px-6 py-3.5',
        size === 'lg' && 'px-10 py-4',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
