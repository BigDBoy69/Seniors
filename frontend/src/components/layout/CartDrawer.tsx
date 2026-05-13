import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { cn, formatPrice } from '@/lib/utils'

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal } = useCart()

  return (
    <>
      <div
        className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-400', isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}
        onClick={closeCart}
      />
      <aside className={cn('fixed top-0 right-0 bottom-0 z-50 w-full max-w-md luxury-panel flex flex-col transition-transform duration-500', isOpen ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-charcoal-100">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} />
            <span className="font-sans text-xs tracking-widest uppercase">Your Cart</span>
            {items.length > 0 && <span className="text-2xs font-sans text-charcoal-500">({items.length})</span>}
          </div>
          <button onClick={closeCart} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <ShoppingBag size={40} className="text-charcoal-200" />
              <p className="font-serif text-xl">Your cart is empty</p>
              <button onClick={closeCart} className="border border-charcoal text-charcoal text-xs font-sans tracking-widest uppercase px-6 py-3 hover:bg-charcoal hover:text-cream transition-all">
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-charcoal-100">
              {items.map((item) => (
                <li key={`${item.productId}-${item.variantId}`} className="flex gap-4 py-5">
                  <div className="relative w-20 h-26 flex-shrink-0 bg-cream-200 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <Link to={`/shop/${item.slug}`} onClick={closeCart} className="font-serif text-base text-charcoal hover:text-taupe transition-colors leading-tight">
                      {item.name}
                    </Link>
                    {(item.size || item.color) && <p className="text-2xs font-sans text-charcoal-500">{[item.size, item.color].filter(Boolean).join(' · ')}</p>}
                    <p className="text-sm font-sans font-medium mt-1">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} className="w-7 h-7 border border-charcoal-200 flex items-center justify-center hover:border-charcoal transition-colors">
                        <Minus size={12} />
                      </button>
                      <span className="text-sm w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="w-7 h-7 border border-charcoal-200 flex items-center justify-center hover:border-charcoal transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} />
                      </button>
                      <button onClick={() => removeItem(item.productId, item.variantId)} className="ml-2 text-2xs font-sans text-charcoal-500 hover:text-charcoal underline underline-offset-2">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-charcoal-100 px-6 py-6 flex flex-col gap-4">
            <div className="bg-charcoal text-cream px-4 py-3 text-2xs font-sans tracking-[0.15em] uppercase text-center">Cash on Delivery — Payment upon receipt</div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans tracking-widest uppercase text-charcoal-500">Subtotal</span>
              <span className="font-serif text-lg">{formatPrice(subtotal())}</span>
            </div>
            <Link to="/checkout" onClick={closeCart} className="w-full bg-charcoal text-cream text-xs font-sans tracking-widest uppercase py-4 flex items-center justify-center hover:bg-charcoal-500 transition-all">
              Proceed to Checkout
            </Link>
            <Link to="/cart" onClick={closeCart} className="text-center text-2xs font-sans tracking-widest uppercase text-charcoal-500 hover:text-charcoal transition-colors">
              View Full Cart
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
