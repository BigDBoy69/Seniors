import { cn } from '@/lib/utils'

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-charcoal-100', className)} />
}
