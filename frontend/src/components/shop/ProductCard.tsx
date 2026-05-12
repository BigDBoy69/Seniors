import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { ProductStatusBadge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { addToWishlist, removeFromWishlist } from '@/lib/api'
import { getAuthToken } from '@/hooks/useAuth'
import type { Product } from '@/lib/api'

export function ProductCard({ product, wishlistId, onWishlistChange }: { product: Product; wishlistId?: string; onWishlistChange?: () => void }) {
  const [primary, hover] = product.images
  const sizes = [...new Set(product.variants.filter((v) => v.size && v.stock > v.reserved).map((v) => v.size!))]
  const { isAuthenticated } = useAuth()
  const [savedId, setSavedId] = useState<string | undefined>(wishlistId)
  const [isSaved, setIsSaved] = useState(!!wishlistId)
  const [isLoading, setIsLoading] = useState(false)

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) return

    const token = getAuthToken()
    if (!token) return

    setIsLoading(true)
    try {
      if (isSaved && savedId) {
        await removeFromWishlist(token, savedId)
        setIsSaved(false)
        setSavedId(undefined)
      } else {
        const { item } = await addToWishlist(token, product.id)
        setIsSaved(true)
        setSavedId(item.id)
      }
      onWishlistChange?.()
    } catch {
      // revert optimistic state on failure
      setIsSaved((prev) => !prev)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <article className="group relative">
      <Link to={`/shop/${product.slug}`}>
        <div className="relative aspect-3/4 overflow-hidden bg-cream-200 mb-5">
          {primary && <img src={primary} alt={product.name} className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 ${hover ? 'group-hover:opacity-0' : ''}`} />}
          {hover && <img src={hover} alt={product.name} className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-110" />}
          <div className="absolute top-4 left-4">{!['AVAILABLE', 'ACTIVE'].includes(product.status) && <ProductStatusBadge status={product.status} />}</div>
          <button
            onClick={handleWishlist}
            disabled={isLoading}
            className={`absolute top-4 right-4 p-2 transition-all duration-300 ${isSaved ? 'bg-charcoal text-cream' : 'bg-cream/80 text-charcoal opacity-0 group-hover:opacity-100'} hover:bg-charcoal hover:text-cream disabled:opacity-50`}
            aria-label={isSaved ? 'Remove from saved items' : 'Save item'}
          >
            <Heart size={16} strokeWidth={1.5} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="space-y-1.5 pt-4">
          <p className="font-serif text-lg text-cream leading-tight group-hover:text-cream/70 transition-colors duration-300">{product.name}</p>
          {sizes.length > 0 && <p className="text-xs font-sans text-cream/40 tracking-wider">{sizes.join('  ·  ')}</p>}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-sm font-sans text-cream/70">{formatPrice(product.price)}</span>
            {product.compareAtPrice && <span className="text-sm font-sans text-cream/35 line-through">{formatPrice(product.compareAtPrice)}</span>}
          </div>
        </div>
      </Link>
    </article>
  )
}
