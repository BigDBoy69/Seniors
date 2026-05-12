import { cn } from '@/lib/utils'
import type { ProductStatus } from '@/lib/api'

export function Badge({
  label,
  variant = 'default',
  className,
}: {
  label: string
  variant?: 'default' | 'limited' | 'sold-out' | 'coming-soon' | 'pre-order' | 'status'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block px-2.5 py-1 text-2xs font-sans tracking-widest uppercase',
        variant === 'default' && 'bg-charcoal text-cream',
        variant === 'status' && 'bg-cream/90 text-charcoal border border-charcoal/20',
        variant === 'limited' && 'bg-gold text-cream',
        variant === 'sold-out' && 'bg-charcoal/70 text-cream',
        variant === 'coming-soon' && 'bg-blush text-charcoal',
        variant === 'pre-order' && 'border border-gold text-gold',
        className,
      )}
    >
      {label}
    </span>
  )
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const map: Record<ProductStatus, { label: string; variant: 'status' | 'limited' | 'sold-out' | 'coming-soon' | 'pre-order' }> = {
    ACTIVE: { label: 'Active', variant: 'status' },
    DRAFT: { label: 'Draft', variant: 'coming-soon' },
    AVAILABLE: { label: 'Available', variant: 'status' },
    LIMITED: { label: 'Limited', variant: 'limited' },
    SOLD_OUT: { label: 'Sold Out', variant: 'sold-out' },
    COMING_SOON: { label: 'Coming Soon', variant: 'coming-soon' },
    PRE_ORDER: { label: 'Pre-Order', variant: 'pre-order' },
    ARCHIVED: { label: 'Archived', variant: 'sold-out' },
  }
  const { label, variant } = map[status]
  return <Badge label={label} variant={variant} />
}
