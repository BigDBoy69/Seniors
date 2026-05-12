import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getProducts } from '@/lib/api'
import { request } from '@/lib/transport'
import { getAuthToken } from '@/hooks/useAuth'
import { formatPrice } from '@/lib/utils'

type RecommendationType = 'similar' | 'complete-the-look' | 'personalized' | 'trending'
type RecommendationSource = RecommendationType | 'curated'

interface RecommendedProduct {
  id: string
  name: string
  slug: string
  price: number
  images: string | string[]
  score?: number
  reason?: string
}

interface Props {
  type: RecommendationType
  productId?: string
  title?: string
  subtitle?: string
  limit?: number
  fallbackTypes?: RecommendationType[]
  ctaLabel?: string
  ctaTo?: string
  variant?: 'default' | 'product-page'
}

function defaultFallbackPipeline(type: RecommendationType): RecommendationType[] {
  if (type === 'personalized') return ['trending']
  if (type === 'complete-the-look') return ['similar', 'trending']
  if (type === 'similar') return ['complete-the-look', 'trending']
  return []
}

function getEndpoint(type: RecommendationType, productId?: string, limit: number = 8): string | null {
  if (type === 'similar') return productId ? `/api/recommendations/similar/${productId}?limit=${limit}` : null
  if (type === 'complete-the-look') return productId ? `/api/recommendations/complete-the-look/${productId}?limit=${limit}` : null
  if (type === 'personalized') return `/api/recommendations/personalized?limit=${limit}`
  return `/api/recommendations/trending?limit=${limit}`
}

function parsePrimaryImage(images: string | string[]): string {
  if (Array.isArray(images)) return images[0] || ''
  try {
    const parsed = JSON.parse(images)
    return Array.isArray(parsed) ? parsed[0] || '' : images
  } catch {
    return images
  }
}

const GAP_DEFAULT = 20 // px — matches the inline gap between cards
const GAP_PRODUCT_PAGE = 28 // larger gap for product page variant

export default function RecommendationWidget({
  type,
  productId,
  title,
  subtitle,
  limit = 8,
  fallbackTypes,
  ctaLabel,
  ctaTo,
  variant = 'default',
}: Props) {
  const [products, setProducts] = useState<RecommendedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSource, setActiveSource] = useState<RecommendationSource>(type)

  // Outer ref to measure container width for card sizing
  const outerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Card width calculation varies by variant
  // default: 2.5 cards visible, product-page: 1.75 cards visible
  const [cardW, setCardW] = useState(320)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const isProductPage = variant === 'product-page'
  const GAP = isProductPage ? GAP_PRODUCT_PAGE : GAP_DEFAULT
  const VISIBLE_CARDS = isProductPage ? 2.25 : 3.5
  const VISIBLE_GAPS = isProductPage ? 1.25 : 2.5

  const pipeline = useMemo(() => {
    const list = [type, ...(fallbackTypes ?? defaultFallbackPipeline(type))]
    return list.filter((value, index) => list.indexOf(value) === index)
  }, [type, fallbackTypes])

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const token = getAuthToken()
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined

        for (const source of pipeline) {
          const endpoint = getEndpoint(source, productId, limit)
          if (!endpoint) continue
          try {
            const data = await request<{ recommendations?: RecommendedProduct[] }>(endpoint, { headers })
            if (data.recommendations?.length) {
              setProducts(data.recommendations)
              setActiveSource(source)
              return
            }
          } catch {
            continue
          }
        }

        const newArrivals = await getProducts({ newArrivals: 'true' })
        if (newArrivals.length > 0) {
          setProducts(newArrivals.slice(0, limit).map(p => ({
            id: p.id, name: p.name, slug: p.slug, price: p.price, images: p.images,
          })))
          setActiveSource('curated')
          return
        }

        const featured = await getProducts({ featured: 'true' })
        setProducts(featured.slice(0, limit).map(p => ({
          id: p.id, name: p.name, slug: p.slug, price: p.price, images: p.images,
        })))
        setActiveSource('curated')
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    fetchRecommendations()
  }, [pipeline, productId, limit])

  // Recompute card width whenever the outer container resizes
  useEffect(() => {
    const compute = () => {
      const el = outerRef.current
      if (!el) return
      // Calculate card width based on variant
      // default: 3.5 cards visible with 3 gaps
      // product-page: 2.25 cards visible with 1.5 gaps (more premium feel)
      setCardW((el.clientWidth - VISIBLE_GAPS * GAP) / VISIBLE_CARDS)
    }
    compute()
    const ro = new ResizeObserver(compute)
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [VISIBLE_CARDS, VISIBLE_GAPS, GAP])

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  // Re-check arrows after products load (after paint)
  useEffect(() => {
    const id = requestAnimationFrame(updateArrows)
    return () => cancelAnimationFrame(id)
  }, [products, cardW])

  const scroll = (dir: 'left' | 'right') => {
    // Scroll by one full card width + gap for smooth carousel feel
    const scrollAmount = isProductPage ? cardW + GAP : cardW + GAP
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  // Vertical position of arrows
  // default: center of 3:4 image
  // product-page: center of carousel viewport
  const arrowTop = isProductPage ? undefined : Math.round((cardW * 4) / 3 / 2)

  const resolvedTitle = title ?? (
    activeSource === 'personalized' ? 'Recommended For You'
    : activeSource === 'trending' ? 'Trending Now'
    : activeSource === 'curated' ? 'Curated For You'
    : 'You May Also Like'
  )

  if (loading) return (
    <div className="py-12 text-cream/30 text-2xs font-sans tracking-[0.25em] uppercase">
      Loading recommendations...
    </div>
  )

  if (products.length === 0) return null

  return (
    <div className={isProductPage ? 'py-16' : 'py-12'} ref={outerRef}>
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-2xs font-sans tracking-[0.35em] uppercase text-cream/35 mb-3">
            {subtitle ?? 'Maison Selection'}
          </p>
          <h2 className={isProductPage ? 'font-serif text-4xl text-cream' : 'font-serif text-3xl text-cream'}>
            {resolvedTitle}
          </h2>
        </div>
        {ctaLabel && ctaTo && (
          <Link
            to={ctaTo}
            className="text-2xs font-sans tracking-[0.15em] uppercase text-cream/50 border-b border-cream/30 pb-px hover:text-cream hover:border-cream transition-all duration-200 whitespace-nowrap"
          >
            {ctaLabel}
          </Link>
        )}
      </div>

      {/* Carousel container with side arrows for product-page variant */}
      <div
        ref={carouselRef}
        className={isProductPage ? 'relative px-20' : 'relative'}
      >

        {/* Left arrow */}
        {canLeft && (
          <button
            onClick={() => scroll('left')}
            style={isProductPage ? undefined : { top: arrowTop }}
            className={
              isProductPage
                ? 'absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center text-cream/40 hover:text-cream transition-all duration-300'
                : 'absolute left-3 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-[#0f0d0c]/70 hover:bg-[#0f0d0c]/95 text-cream/65 hover:text-cream transition-all duration-200 backdrop-blur-sm'
            }
            aria-label="Scroll left"
          >
            <ChevronLeft size={isProductPage ? 28 : 16} strokeWidth={isProductPage ? 1 : 1.2} />
          </button>
        )}

        {/* Horizontal scroll container */}
        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="flex overflow-x-auto pb-2"
          style={{
            gap: `${GAP}px`,
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          {products.map((product) => {
            const imageUrl = parsePrimaryImage(product.images)
            return (
              <article
                key={product.id}
                style={{ width: `${cardW}px`, flexShrink: 0, scrollSnapAlign: 'start' }}
              >
                <Link to={`/shop/${product.slug}`} className="group block">
                  <div
                    className={
                      isProductPage
                        ? "relative w-full overflow-hidden bg-cream-200 mb-6"
                        : "relative w-full overflow-hidden bg-cream-200 mb-5"
                    }
                    style={{ aspectRatio: '3/4' }}
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        draggable={false}
                      />
                    )}
                  </div>
                  <p className={
                    isProductPage
                      ? "font-serif text-xl text-cream leading-tight mb-2 group-hover:text-cream/70 transition-colors duration-200"
                      : "font-serif text-lg text-cream leading-tight mb-1.5 group-hover:text-cream/70 transition-colors duration-200"
                  }>
                    {product.name}
                  </p>
                  <p className="text-sm font-sans text-cream/45">
                    {formatPrice(product.price)}
                  </p>
                </Link>
              </article>
            )
          })}
        </div>

        {/* Right arrow */}
        {canRight && (
          <button
            onClick={() => scroll('right')}
            style={isProductPage ? undefined : { top: arrowTop }}
            className={
              isProductPage
                ? 'absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center text-cream/40 hover:text-cream transition-all duration-200'
                : 'absolute right-3 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-[#0f0d0c]/70 hover:bg-[#0f0d0c]/95 text-cream/65 hover:text-cream transition-all duration-200 backdrop-blur-sm'
            }
            aria-label="Scroll right"
          >
            <ChevronRight size={isProductPage ? 28 : 16} strokeWidth={isProductPage ? 1 : 1.2} />
          </button>
        )}

      </div>
    </div>
  )
}
