import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getUserOrders, type UserOrder } from '@/lib/api'
import { getAuthToken } from '@/hooks/useAuth'
import { formatPrice } from '@/lib/utils'

export function AccountOrdersPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [orders, setOrders] = useState<UserOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrders = async () => {
      const token = getAuthToken()
      if (!token) return
      try {
        const { orders } = await getUserOrders(token)
        setOrders(orders)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    if (isAuthenticated) {
      loadOrders()
    }
  }, [isAuthenticated])

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
          <h1 className="font-serif text-4xl lg:text-5xl text-cream">My Orders</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-16">
          <aside className="space-y-2">
            <Link to="/account" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
              Profile
            </Link>
            <Link to="/account/orders" className="block text-sm text-cream py-2 border-b border-cream/20">
              My Orders
            </Link>
            <Link to="/account/saved" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
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
            {orders.length === 0 ? (
              <div className="luxury-surface p-10 text-center">
                <p className="text-charcoal-400 mb-4">No orders yet</p>
                <Link to="/shop" className="text-xs uppercase tracking-widest text-charcoal underline hover:text-taupe-dark">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="luxury-surface p-6 lg:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-charcoal-100">
                      <div>
                        <p className="text-2xs uppercase tracking-widest text-charcoal-400 mb-1">Order {order.orderNumber}</p>
                        <p className="text-sm text-charcoal">{new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 text-xs uppercase tracking-wider bg-charcoal-100 text-charcoal">
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4 mb-6">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex gap-4">
                          {item.product.images[0] && (
                            <img src={item.product.images[0]} alt={item.name} className="w-16 h-20 object-cover bg-charcoal-100" />
                          )}
                          <div className="flex-1">
                            <p className="font-serif text-charcoal">{item.name}</p>
                            <p className="text-sm text-charcoal-400">
                              {item.quantity} × {formatPrice(item.price)}
                              {item.size && ` · Size ${item.size}`}
                              {item.color && ` · ${item.color}`}
                            </p>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-charcoal-400">+ {order.items.length - 3} more items</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-charcoal-100">
                      <span className="text-sm text-charcoal-400">Total</span>
                      <span className="font-serif text-charcoal">{formatPrice(order.total)}</span>
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
