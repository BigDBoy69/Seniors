import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getWishlist, removeFromWishlist, type WishlistItem } from '@/lib/api'
import { getAuthToken } from '@/hooks/useAuth'
import { formatPrice } from '@/lib/utils'
import { Heart, ShoppingBag, Trash2 } from 'lucide-react'

export function AccountWishlistPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadWishlist = async () => {
      const token = getAuthToken()
      if (!token) return
      try {
        const { items } = await getWishlist(token)
        setItems(items)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    if (isAuthenticated) {
      loadWishlist()
    }
  }, [isAuthenticated])

  const handleRemove = async (id: string) => {
    const token = getAuthToken()
    if (!token) return
    try {
      await removeFromWishlist(token, id)
      setItems(items.filter((item) => item.id !== id))
    } catch {
      // ignore
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen pt-24 bg-[#0f0d0c]">
        <div className="max-w-8xl mx-auto px-6 lg:px-12 py-12 text-cream">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-12">
        <div className="mb-10">
          <p className="text-2xs uppercase tracking-[0.3em] text-cream/50 mb-3">Account</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream">Saved Items</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-16">
          <aside className="space-y-2">
            <Link to="/account" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
              Profile
            </Link>
            <Link to="/account/orders" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
              My Orders
            </Link>
            <Link to="/account/saved" className="block text-sm text-cream py-2 border-b border-cream/20">
              Saved Items
            </Link>
            <Link to="/recommendations" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
              Recommendations
            </Link>
            <Link to="/account/addresses" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
              Addresses
            </Link>
          </aside>

          <div className="lg:col-span-3">
            {items.length === 0 ? (
              <div className="luxury-surface p-10 text-center">
                <Heart className="w-12 h-12 mx-auto mb-4 text-charcoal-300" />
                <p className="text-charcoal-400 mb-4">No saved items yet</p>
                <Link to="/shop" className="text-xs uppercase tracking-widest text-charcoal underline hover:text-taupe-dark">
                  Discover Products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div key={item.id} className="luxury-surface overflow-hidden group">
                    <div className="relative aspect-3/4 overflow-hidden">
                      {item.product.images[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-charcoal-100 flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-charcoal-300" />
                        </div>
                      )}
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="absolute top-3 right-3 p-2 bg-cream/90 text-charcoal hover:bg-cream transition-colors"
                        aria-label="Remove from saved items"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">
                        {item.product.category?.name}
                      </p>
                      <Link
                        to={`/shop/${item.product.slug}`}
                        className="block font-serif text-lg text-charcoal hover:text-taupe-dark transition-colors mb-2"
                      >
                        {item.product.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-charcoal">{formatPrice(item.product.price)}</span>
                        {item.product.compareAtPrice && (
                          <span className="text-charcoal-400 line-through">{formatPrice(item.product.compareAtPrice)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
