import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number): string {
  return `${new Intl.NumberFormat('en-LB', { style: 'decimal', maximumFractionDigits: 0 }).format(amount)} L.L.`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-LB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending Confirmation',
    CONFIRMED: 'Confirmed',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  }
  return map[status] ?? status
}
