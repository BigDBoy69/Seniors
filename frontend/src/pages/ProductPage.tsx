import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getProduct, type Product, type StorePolicy } from '@/lib/api'
import { ProductGallery } from '@/components/product/ProductGallery'
import { VariantSelector } from '@/components/product/VariantSelector'
import { formatPrice } from '@/lib/utils'
import RecommendationWidget from '@/components/recommendations/RecommendationWidget'

const RECENT_PRODUCTS_KEY = 'akwaluzto_recent_products'

// Statuses that display a visible badge on the product page
const BADGE_STATUSES = ['SOLD_OUT', 'LIMITED', 'COMING_SOON', 'PRE_ORDER'] as const
type BadgeStatus = typeof BADGE_STATUSES[number]

function statusLabel(s: string): string {
  return { SOLD_OUT: 'Sold Out', LIMITED: 'Limited', COMING_SOON: 'Coming Soon', PRE_ORDER: 'Pre-Order' }[s] ?? s
}

// Minimal accordion row for the service info panel
function InfoRow({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-cream/10">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-2xs font-sans tracking-[0.18em] uppercase text-cream/45 hover:text-cream/70 transition-colors duration-200"
      >
        <span>{label}</span>
        <span
          className={`transition-transform duration-200 text-cream/30 text-base leading-none select-none ${open ? 'rotate-45' : ''}`}
          aria-hidden
        >
          +
        </span>
      </button>
      {open && (
        <p className="text-sm font-sans text-cream/40 leading-[1.75] pb-4 pr-2 whitespace-pre-line">
          {content}
        </p>
      )}
    </div>
  )
}

export function ProductPage() {
  const { slug = '' } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [policy, setPolicy] = useState<StorePolicy | null>(null)

  // Film strip scroll state
  const galleryScrollRef = useRef<HTMLDivElement>(null)
  const [filmOffset, setFilmOffset] = useState(0)

  // Desktop lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    getProduct(slug)
      .then(({ product: p, policy: pol }) => {
        setProduct(p)
        setPolicy(pol)
        setFilmOffset(0)
        try {
          const raw = localStorage.getItem(RECENT_PRODUCTS_KEY)
          const parsed = raw ? JSON.parse(raw) : []
          const existing = Array.isArray(parsed)
            ? parsed.filter((id: unknown): id is string => typeof id === 'string')
            : []
          const next = [p.id, ...existing.filter((id) => id !== p.id)].slice(0, 12)
          localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(next))
        } catch {
          // ignore storage errors
        }
      })
      .catch(() => setProduct(null))
  }, [slug])

  // Drive film strip translation from outer div scroll position
  useEffect(() => {
    if (!product) return
    const n = product.images.length
    const GAP = 16
    const maxOffset = Math.max(0, (n - 1) * (window.innerHeight + GAP))
    const onScroll = () => {
      const el = galleryScrollRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrolledPast = Math.max(0, -rect.top)
      setFilmOffset(Math.min(scrolledPast, maxOffset))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [product?.images.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Desktop lightbox keyboard
  useEffect(() => {
    if (!lightboxOpen || !product) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') setLightboxIndex(i => (i === 0 ? product.images.length - 1 : i - 1))
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i === product.images.length - 1 ? 0 : i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, product])

  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxOpen])

  if (!product) return (
    <div className="min-h-screen pt-32 max-w-6xl mx-auto px-6 text-cream/60 font-sans">
      Product not found.
    </div>
  )

  const IMG_GAP = 16
  const n = product.images.length
  const hasMany = n > 1
  const currentImageIndex = hasMany
    ? Math.min(n - 1, Math.floor(filmOffset / (window.innerHeight + IMG_GAP)))
    : 0
  const maxOffset = hasMany ? (n - 1) * (window.innerHeight + IMG_GAP) : 1
  const stripProgress = hasMany ? Math.min(1, filmOffset / maxOffset) : 1

  const info = product.productInfo ?? null
  const showBadge = BADGE_STATUSES.includes(product.status as BadgeStatus)

  // Build service accordion rows — each shows only if it resolves to a non-null value
  const serviceRows: Array<{ label: string; content: string }> = []
  const delivery = info?.deliveryInfo ?? policy?.defaultDeliveryInfo ?? null
  const returns  = info?.returnsInfo  ?? policy?.defaultReturnsInfo  ?? null
  const shipping = info?.shippingInfo ?? policy?.defaultShippingInfo ?? null
  const details  = info?.productDetails ?? product.fabric ?? null

  if (delivery) serviceRows.push({ label: 'Delivery', content: delivery })
  if (returns)  serviceRows.push({ label: 'Returns & Exchange', content: returns })
  if (shipping) serviceRows.push({ label: 'Shipping', content: shipping })
  if (details)  serviceRows.push({ label: 'Product Details', content: details })
  if (info?.material) serviceRows.push({ label: 'Material', content: info.material })

  const hasSizeGuide = !!info?.sizeGuideType
  const hasServicePanel = serviceRows.length > 0 || hasSizeGuide

  // Right column content — shared between desktop and mobile
  function InfoPanel() {
    return (
      <div className="w-full max-w-lg py-16">
        {/* Category line */}
        {product!.category && (
          <p className="text-2xs font-sans tracking-[0.25em] uppercase text-cream/40 mb-4">
            {product!.category.name}
          </p>
        )}

        {/* Subtitle / context */}
        {info?.subtitle && (
          <p className="text-xs font-sans tracking-[0.05em] text-cream/35 italic mb-4">
            {info.subtitle}
          </p>
        )}

        {/* Product name */}
        <h1 className="font-serif text-[2.75rem] leading-[1.1] tracking-tight text-cream mb-8">
          {product!.name}
        </h1>

        {/* Status badge — only for states that need flagging */}
        {showBadge && (
          <p className="text-2xs font-sans tracking-[0.2em] uppercase text-cream/50 border border-cream/20 inline-block px-3 py-1.5 mb-6">
            {statusLabel(product!.status)}
          </p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-4 mb-10">
          <span className="font-serif text-[1.75rem] text-cream">{formatPrice(product!.price)}</span>
          {product!.compareAtPrice && (
            <span className="text-base font-sans text-cream/30 line-through">
              {formatPrice(product!.compareAtPrice)}
            </span>
          )}
        </div>

        <div className="w-16 h-px bg-cream/20 mb-10" />

        {/* Description */}
        {product!.description && (
          <p className="text-base font-sans text-cream/55 leading-[1.8] mb-12 max-w-md">
            {product!.description}
          </p>
        )}

        {/* Variants + Add to Bag */}
        <VariantSelector product={product!} />

        {/* Service info panel */}
        {hasServicePanel && (
          <div className="mt-8 border-b border-cream/10">
            {serviceRows.map(row => (
              <InfoRow key={row.label} label={row.label} content={row.content} />
            ))}

            {/* Size guide — text variant */}
            {info?.sizeGuideType === 'text' && info.sizeGuideContent && (
              <InfoRow label="Size Guide" content={info.sizeGuideContent} />
            )}

            {/* Size guide — link variant */}
            {info?.sizeGuideType === 'url' && info.sizeGuideUrl && (
              <div className="border-t border-cream/10 py-4">
                <a
                  href={info.sizeGuideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xs font-sans tracking-[0.18em] uppercase text-cream/45 hover:text-cream/70 transition-colors duration-200"
                >
                  View Size Guide →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Collection note */}
        {info?.collectionNote && (
          <div className="mt-8 pt-6 border-t border-cream/10">
            <p className="text-2xs font-sans tracking-[0.15em] uppercase text-cream/30 mb-3">Collection</p>
            <p className="text-sm font-sans text-cream/40 leading-relaxed italic">{info.collectionNote}</p>
          </div>
        )}

        {/* Featured info card */}
        {info?.infoCardTitle && (
          <div className="mt-8 border border-cream/12 p-5">
            {info.infoCardImage && (
              <img
                src={info.infoCardImage}
                alt={info.infoCardTitle}
                className="w-full h-28 object-cover mb-4 opacity-70"
                draggable={false}
              />
            )}
            <p className="text-2xs font-sans tracking-[0.18em] uppercase text-cream/50 mb-2">
              {info.infoCardTitle}
            </p>
            {info.infoCardBody && (
              <p className="text-sm font-sans text-cream/35 leading-[1.75] mb-3">
                {info.infoCardBody}
              </p>
            )}
            {info.infoCardCtaLabel && info.infoCardCtaUrl && (
              <a
                href={info.infoCardCtaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xs font-sans tracking-[0.15em] uppercase text-cream/50 border-b border-cream/20 pb-px hover:text-cream/80 hover:border-cream/50 transition-colors duration-200"
              >
                {info.infoCardCtaLabel}
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0d0c]">
      {/* ─── Breadcrumb nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-6 lg:px-12 py-5 bg-[#0f0d0c]/95 backdrop-blur-sm">
        <div className="max-w-8xl mx-auto flex items-center gap-2 text-2xs font-sans tracking-[0.18em] uppercase text-cream/40">
          <Link to="/shop" className="hover:text-cream/80 transition-colors duration-200">
            Collection
          </Link>
          <span className="text-cream/20">/</span>
          <span className="text-cream/60">{product.name}</span>
        </div>
      </nav>

      {/* ─── Desktop ────────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div
          ref={galleryScrollRef}
          style={{ height: `calc(${n * 100}vh + ${(n - 1) * IMG_GAP}px)` }}
        >
          <div className="sticky top-0 h-screen flex overflow-hidden">

            {/* Left: film strip viewport */}
            <div className="w-[52%] h-full overflow-hidden relative">
              <div
                style={{ transform: `translateY(${-filmOffset}px)`, willChange: 'transform' }}
              >
                {product.images.map((src, i) => (
                  <div key={i}>
                    <div
                      className="w-full bg-cream-200 cursor-zoom-in"
                      style={{ height: '100vh' }}
                      onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                    >
                      <img
                        src={src}
                        alt={`${product.name} — ${i + 1}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    {i < n - 1 && (
                      <div style={{ height: `${IMG_GAP}px`, background: '#0f0d0c' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              {hasMany && (
                <div className="absolute top-0 left-0 right-0 h-px bg-cream/10 z-10 pointer-events-none">
                  <div
                    className="h-full bg-cream/45"
                    style={{ width: `${stripProgress * 100}%`, transition: 'width 80ms linear' }}
                  />
                </div>
              )}

              {/* Counter */}
              {hasMany && (
                <div className="absolute bottom-8 left-8 text-2xs font-sans tracking-[0.2em] text-cream/50 pointer-events-none select-none z-10">
                  {String(currentImageIndex + 1).padStart(2, '0')}
                  <span className="mx-1 text-cream/25">/</span>
                  {String(n).padStart(2, '0')}
                </div>
              )}

              {/* Scroll hint */}
              {hasMany && (
                <div
                  className="absolute bottom-8 right-8 text-2xs font-sans tracking-[0.15em] uppercase pointer-events-none select-none z-10"
                  style={{ color: 'rgba(248,244,238,0.35)' }}
                >
                  {stripProgress > 0.92 ? 'Continue scrolling' : 'Scroll through images'}
                </div>
              )}

              {/* View hint on hover */}
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-end justify-end p-8 z-10">
                <span className="text-2xs font-sans tracking-[0.2em] uppercase text-cream/60 bg-[#0f0d0c]/50 px-3 py-1.5 backdrop-blur-sm">
                  View
                </span>
              </div>
            </div>

            {/* Right: product info — stationary */}
            <div className="w-[48%] h-full overflow-y-auto">
              <div className="min-h-full flex items-center px-16">
                <InfoPanel />
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations — after scroll budget */}
        <div className="px-16 pt-24 pb-32">
          <RecommendationWidget type="similar" productId={product.id} limit={8} variant="product-page" />
          <div className="h-16" />
        </div>

        {/* Desktop lightbox */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'rgba(12,10,9,0.98)' }}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-6 right-8 text-cream/30 hover:text-cream/90 transition-colors duration-200 z-10"
              aria-label="Close"
            >
              <X size={20} strokeWidth={0.8} />
            </button>
            {hasMany && (
              <div className="absolute top-6 left-8 text-2xs font-sans tracking-[0.2em] text-cream/20 select-none">
                {String(lightboxIndex + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
              </div>
            )}
            <div className="flex-1 flex items-center justify-center px-20 py-12 relative">
              {hasMany && (
                <>
                  <button onClick={() => setLightboxIndex(i => (i === 0 ? n - 1 : i - 1))} className="absolute left-8 top-1/2 -translate-y-1/2 text-cream/15 hover:text-cream/70 transition-colors p-4" aria-label="Previous">
                    <ChevronLeft size={24} strokeWidth={0.6} />
                  </button>
                  <button onClick={() => setLightboxIndex(i => (i === n - 1 ? 0 : i + 1))} className="absolute right-8 top-1/2 -translate-y-1/2 text-cream/15 hover:text-cream/70 transition-colors p-4" aria-label="Next">
                    <ChevronRight size={24} strokeWidth={0.6} />
                  </button>
                </>
              )}
              <div className="relative w-full h-full flex items-center justify-center">
                {product.images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${product.name} — ${i + 1}`}
                    className="absolute object-contain select-none"
                    style={{
                      opacity: i === lightboxIndex ? 1 : 0,
                      transition: 'opacity 280ms ease-out',
                      maxHeight: '85vh',
                      maxWidth: 'min(70vw, 800px)',
                      width: 'auto',
                      height: 'auto',
                    }}
                    draggable={false}
                  />
                ))}
              </div>
            </div>
            {hasMany && (
              <div className="flex items-end justify-center gap-2 pb-10 px-8 flex-shrink-0">
                {product.images.map((src, i) => (
                  <button key={i} onClick={() => setLightboxIndex(i)} className="relative flex-shrink-0 focus:outline-none">
                    <div style={{ width: 44, height: 56 }} className="overflow-hidden">
                      <img src={src} alt="" className="w-full h-full object-cover" style={{ opacity: lightboxIndex === i ? 0.9 : 0.25, transition: 'opacity 250ms ease-out' }} draggable={false} />
                    </div>
                    <div className="absolute -bottom-1.5 left-0 right-0 h-px" style={{ background: lightboxIndex === i ? 'rgba(248,244,238,0.5)' : 'transparent', transition: 'background 250ms ease-out' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Mobile ─────────────────────────────────────────────────────── */}
      <div className="lg:hidden pt-20">
        <div className="px-6 py-8">
          <ProductGallery images={product.images} name={product.name} />
        </div>
        <div className="px-6 py-8 max-w-md mx-auto">
          <InfoPanel />
        </div>
        <div className="px-6 mt-4">
          <RecommendationWidget type="similar" productId={product.id} limit={8} variant="product-page" />
          <div className="h-16" />
        </div>
      </div>
    </div>
  )
}
