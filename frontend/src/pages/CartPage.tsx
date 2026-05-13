import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'

export function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center px-6 text-center gap-6">
        <ShoppingBag size={48} className="text-charcoal-200" />
        <h1 className="font-serif text-4xl">Your cart is empty</h1>
        <Link to="/shop" className="bg-cream text-charcoal text-xs font-sans tracking-widest uppercase px-8 py-4 hover:bg-cream-200 transition-colors">
          Explore the Shop
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 pt-16 pb-24">
        <h1 className="font-serif text-5xl mb-12">Your Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <ul className="divide-y divide-charcoal-100">
              {items.map((item) => (
                <li key={`${item.productId}-${item.variantId}`} className="py-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-6 flex gap-4">
                    <div className="relative w-20 h-26 flex-shrink-0 overflow-hidden bg-cream-200">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center gap-1 min-w-0">
                      <Link to={`/shop/${item.slug}`} className="font-serif text-base hover:text-taupe transition-colors leading-snug">
                        {item.name}
                      </Link>
                      <button onClick={() => removeItem(item.productId, item.variantId)} className="flex items-center gap-1 text-2xs font-sans text-cream/65 hover:text-cream transition-colors self-start mt-1">
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-center gap-2">
                    <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} className="w-7 h-7 border border-cream/50 flex items-center justify-center hover:border-cream transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                      className="w-7 h-7 border border-cream/50 flex items-center justify-center hover:border-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="sm:col-span-2 text-right hidden sm:block text-sm font-sans">{formatPrice(item.price * item.quantity)}</div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end mt-4">
              <button onClick={clearCart} className="text-2xs font-sans tracking-widest uppercase text-cream/65 hover:text-cream transition-colors">
                Clear Cart
              </button>
            </div>
          </div>
          <div>
            <div className="bg-cream-100 p-6 sticky top-28">
              <h2 className="font-serif text-2xl text-charcoal mb-6">Order Summary</h2>
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between text-sm font-sans text-charcoal-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal())}</span>
                </div>
              </div>
              <Divider className="mb-4" />
              <div className="flex justify-between mb-6 text-charcoal">
                <span className="text-xs font-sans tracking-widest uppercase">Total</span>
                <span className="font-serif text-2xl">{formatPrice(subtotal())}</span>
              </div>
              <Link to="/checkout" style={{ color: '#F8F4EE', backgroundColor: '#1C1917' }} className="w-full text-xs font-sans tracking-widest uppercase py-4 flex items-center justify-center hover:opacity-90 transition-opacity">
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
