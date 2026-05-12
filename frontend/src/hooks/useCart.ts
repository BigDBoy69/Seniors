import { useCartStore } from '@/store/cart'

export function useCart() {
  return useCartStore()
}
