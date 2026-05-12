import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useAuth, getAuthToken } from '@/hooks/useAuth'
import { addToWishlist } from '@/lib/api'
import type { Product } from '@/lib/api'

type WishState = 'idle' | 'saving' | 'saved' | 'exists' | 'login' | 'error'

export function VariantSelector({ product }: { product: Product }) {
  const { addItem, openCart } = useCart()
  const { isAuthenticated } = useAuth()
  const [added, setAdded] = useState(false)
  const [wishState, setWishState] = useState<WishState>('idle')

  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean) as string[])]
  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean) as string[])]

  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] ?? null)
  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null)

  const selectedVariant =
    product.variants.find((v) => (sizes.length === 0 || v.size === selectedSize) && (colors.length === 0 || v.color === selectedColor)) ?? null

  const available = selectedVariant ? selectedVariant.stock - selectedVariant.reserved : null
  const isComing = product.status === 'COMING_SOON'
  const isOut = product.status === 'SOLD_OUT' || product.status === 'ARCHIVED' || (available !== null && available <= 0)

  const handleSave = async () => {
    if (!isAuthenticated) {
      setWishState('login')
      setTimeout(() => setWishState('idle'), 3000)
      return
    }
    if (wishState === 'saving' || wishState === 'saved') return
    const token = getAuthToken()
    if (!token) return
    setWishState('saving')
    try {
      await addToWishlist(token, product.id, selectedVariant?.id ?? undefined)
      setWishState('saved')
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : ''
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('409')) {
        setWishState('exists')
      } else {
        setWishState('error')
      }
      setTimeout(() => setWishState(s => s === 'exists' ? 'saved' : 'idle'), 2500)
    }
  }

  const handleAdd = () => {
    if (isOut || isComing || !product.images[0]) return
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size: selectedSize,
      color: selectedColor,
      slug: product.slug,
      maxStock: available ?? 99,
    })
    setAdded(true)
    openCart()
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Color selector */}
      {colors.length > 0 && (
        <div>
          <p className="text-2xs font-sans tracking-[0.15em] uppercase text-cream/30 mb-3">
            Color
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`px-4 py-2.5 text-xs font-sans tracking-wide transition-all duration-200 border ${
                  selectedColor === c
                    ? 'border-cream/60 text-cream bg-cream/5'
                    : 'border-cream/15 text-cream/50 hover:border-cream/30 hover:text-cream/70'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size selector */}
      {sizes.length > 0 && (
        <div>
          <p className="text-2xs font-sans tracking-[0.15em] uppercase text-cream/30 mb-3">
            Size
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                className={`min-w-[3.5rem] px-4 py-2.5 text-xs font-sans tracking-wide transition-all duration-200 border ${
                  selectedSize === s
                    ? 'border-cream/60 text-cream bg-cream/5'
                    : 'border-cream/15 text-cream/50 hover:border-cream/30 hover:text-cream/70'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add to cart — minimal, elegant */}
      <button
        onClick={handleAdd}
        disabled={isOut || isComing}
        className={`w-full py-4 text-xs font-sans tracking-[0.2em] uppercase transition-all duration-200 ${
          isOut || isComing
            ? 'text-cream/30 border border-cream/10 cursor-not-allowed'
            : added
              ? 'text-cream border border-cream/40'
              : 'text-cream border border-cream/30 hover:border-cream/60 hover:bg-cream/5'
        }`}
      >
        {isComing ? 'Coming Soon' : isOut ? 'Sold Out' : added ? 'Added' : 'Add to Bag'}
      </button>

      {/* Save to Wishlist */}
      <button
        onClick={handleSave}
        disabled={wishState === 'saving'}
        className={`w-full py-3.5 text-xs font-sans tracking-[0.18em] uppercase flex items-center justify-center gap-2.5 transition-all duration-200 border ${
          wishState === 'saved' || wishState === 'exists'
            ? 'border-cream/25 text-cream/60'
            : 'border-cream/12 text-cream/35 hover:border-cream/25 hover:text-cream/55'
        } disabled:opacity-40`}
        aria-label={wishState === 'saved' ? 'Saved to wishlist' : 'Save to wishlist'}
      >
        <Heart
          size={13}
          strokeWidth={1.2}
          fill={wishState === 'saved' || wishState === 'exists' ? 'currentColor' : 'none'}
        />
        {wishState === 'saving' && 'Saving…'}
        {wishState === 'saved' && 'Saved'}
        {wishState === 'exists' && 'Already Saved'}
        {wishState === 'error' && 'Could Not Save'}
        {wishState === 'login' && 'Sign In to Save'}
        {wishState === 'idle' && 'Save Item'}
      </button>

      {/* Login prompt — shown briefly after unauthenticated tap */}
      {wishState === 'login' && (
        <p className="text-center text-2xs font-sans tracking-[0.12em] text-cream/35">
          <Link to="/account" className="underline underline-offset-2 hover:text-cream/60 transition-colors duration-200">
            Sign in
          </Link>
          {' '}to save items to your wishlist
        </p>
      )}
    </div>
  )
}
