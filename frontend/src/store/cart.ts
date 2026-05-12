import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  variantId: string | null
  name: string
  price: number
  image: string
  quantity: number
  size: string | null
  color: string | null
  slug: string
  maxStock: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQuantity: (productId: string, variantId: string | null, qty: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  totalItems: () => number
  subtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (newItem) =>
        set((state) => {
          const idx = state.items.findIndex((i) => i.productId === newItem.productId && i.variantId === newItem.variantId)
          if (idx >= 0) {
            const updated = [...state.items]
            updated[idx] = {
              ...updated[idx],
              quantity: Math.min(updated[idx].quantity + (newItem.quantity ?? 1), updated[idx].maxStock),
            }
            return { items: updated }
          }
          return { items: [...state.items, { ...newItem, quantity: newItem.quantity ?? 1 }] }
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !(i.productId === productId && i.variantId === variantId)),
        })),
      updateQuantity: (productId, variantId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.variantId === variantId ? { ...i, quantity: Math.min(qty, i.maxStock) } : i,
          ),
        }))
      },
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: 'akwaluzto-cart', partialize: (state) => ({ items: state.items }) },
  ),
)
