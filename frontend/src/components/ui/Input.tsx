import * as React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, required, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-2xs font-sans tracking-widest uppercase text-charcoal-400">
          {label}
          {required && <span className="text-gold ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-transparent border-b border-charcoal-200 py-3 text-sm font-sans text-charcoal placeholder:text-charcoal-200 focus:outline-none focus:border-charcoal transition-colors',
          error && 'border-red-400',
          className,
        )}
        {...props}
      />
      {error && <p className="text-2xs text-red-500 font-sans">{error}</p>}
    </div>
  )
})
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, error, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-2xs font-sans tracking-widest uppercase text-charcoal-400">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={4}
        className={cn(
          'w-full bg-transparent border border-charcoal-200 p-3 text-sm font-sans text-charcoal placeholder:text-charcoal-200 focus:outline-none focus:border-charcoal transition-colors resize-none',
          error && 'border-red-400',
          className,
        )}
        {...props}
      />
      {error && <p className="text-2xs text-red-500 font-sans">{error}</p>}
    </div>
  )
})
Textarea.displayName = 'Textarea'
