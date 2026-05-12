import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RecommendationWidget from '@/components/recommendations/RecommendationWidget'
import { ProductCard } from '@/components/shop/ProductCard'
import { getProducts, getWishlist, type Product } from '@/lib/api'
import { getAuthToken, useAuth } from '@/hooks/useAuth'

const RECENT_PRODUCTS_KEY = 'akwaluzto_recent_products'

export function RecommendationsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const [recentProductId, setRecentProductId] = useState<string | null>(null)
  const [wishlistSeedId, setWishlistSeedId] = useState<string | null>(null)
  const [newArrivals, setNewArrivals] = useState<Product[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_PRODUCTS_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRecentProductId(parsed[0])
      }
    } catch {
      setRecentProductId(null)
    }
  }, [])

  useEffect(() => {
    getProducts({ newArrivals: 'true' })
      .then((items) => {
        if (items.length > 0) {
          setNewArrivals(items.slice(0, 4))
          return
        }
        return getProducts({ featured: 'true' }).then((featured) => setNewArrivals(featured.slice(0, 4)))
      })
      .catch(() => setNewArrivals([]))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const token = getAuthToken()
    if (!token) return

    getWishlist(token)
      .then(({ items }) => setWishlistSeedId(items[0]?.product.id ?? null))
      .catch(() => setWishlistSeedId(null))
  }, [isAuthenticated])

  const browsingSectionType = useMemo(() => {
    if (recentProductId) return 'similar' as const
    return isAuthenticated ? ('personalized' as const) : ('trending' as const)
  }, [isAuthenticated, recentProductId])

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 bg-[#0f0d0c]">
        <div className="max-w-8xl mx-auto px-6 lg:px-12 py-12 text-cream">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-12">
        <div className="mb-12">
          <p className="text-2xs uppercase tracking-[0.3em] text-cream/50 mb-3">Private Edit</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream">Your Recommendations</h1>
        </div>

        <RecommendationWidget
          type={browsingSectionType}
          productId={recentProductId ?? undefined}
          fallbackTypes={recentProductId ? ['personalized', 'trending'] : ['trending']}
          title="Based on Your Browsing"
          subtitle="Behavior Signals"
          limit={4}
        />

        <RecommendationWidget
          type={wishlistSeedId ? 'similar' : isAuthenticated ? 'personalized' : 'trending'}
          productId={wishlistSeedId ?? undefined}
          fallbackTypes={wishlistSeedId ? ['personalized', 'trending'] : ['trending']}
          title="Similar to Saved Items"
          subtitle="Wishlist Intelligence"
          limit={4}
        />

        <RecommendationWidget
          type={recentProductId ? 'complete-the-look' : 'trending'}
          productId={recentProductId ?? undefined}
          fallbackTypes={recentProductId ? ['similar', 'trending'] : []}
          title="Complete the Look"
          subtitle="Styling Suggestions"
          limit={4}
        />

        <section className="py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-2xs font-sans tracking-[0.35em] uppercase text-cream/55 mb-3">Fresh Selection</p>
              <h2 className="font-serif text-3xl text-cream">New Arrivals For You</h2>
            </div>
            <Link
              to="/new-arrivals"
              className="text-2xs font-sans tracking-[0.15em] uppercase text-cream border-b border-cream/60 pb-px hover:text-cream/80 hover:border-cream transition-all duration-300 whitespace-nowrap"
            >
              View New Arrivals
            </Link>
          </div>
          {newArrivals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-14">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="luxury-surface p-8 text-center">
              <p className="text-sm text-charcoal-400 mb-4">No new arrivals available right now.</p>
              <Link to="/shop" className="text-xs uppercase tracking-widest text-charcoal underline hover:text-taupe-dark">
                Explore the Collection
              </Link>
            </div>
          )}
        </section>

        <RecommendationWidget
          type="trending"
          title="Trending Now"
          subtitle="Most Loved Pieces"
          limit={4}
        />
      </div>
    </div>
  )
}
