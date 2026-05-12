import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1 text-charcoal">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={cn(
              'w-full border border-charcoal-200 bg-white px-3 py-2.5 pr-10 text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-charcoal',
              error && 'border-red-500 focus:border-red-500',
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-charcoal-400 hover:text-charcoal transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
