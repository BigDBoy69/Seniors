import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { NewsletterForm } from '@/components/home/NewsletterForm'
import { ProductCard } from '@/components/shop/ProductCard'
import { useAuth } from '@/hooks/useAuth'
import { getProducts, type Product } from '@/lib/api'
import { getStorefrontConfig, type HomePageContent, type NavigationItem } from '@/lib/storefront'
import RecommendationWidget from '@/components/recommendations/RecommendationWidget'

export function HomePage() {
  const { isAuthenticated } = useAuth()
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [homeContent, setHomeContent] = useState<HomePageContent | null>(null)
  const [heroLinks, setHeroLinks] = useState<Array<{ to: string; label: string }>>([
    { to: '/men', label: 'Men' },
    { to: '/women', label: 'Women' },
    { to: '/accessories', label: 'Accessories' },
    { to: '/new-arrivals', label: 'New Arrivals' },
  ])

  useEffect(() => {
    Promise.all([getProducts({ featured: 'true' }), getStorefrontConfig()])
      .then(([data, config]) => {
        setFeaturedProducts(data)
        setHomeContent(config.homepage)
        const links = config.navigation
          .filter((item: NavigationItem) => item.location === 'HEADER' && item.visible)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => ({ to: item.path, label: item.label }))
        if (links.length) setHeroLinks(links)
      })
      .catch(() => {
        setFeaturedProducts([])
        setHomeContent(null)
      })
  }, [])

  return (
    <>
      <section className="relative h-[120svh] min-h-[920px] flex items-end overflow-hidden pt-20 bg-charcoal">
        <div className="absolute inset-0">
          <img
            src={homeContent?.heroImage ?? '/images/hero.jpeg'}
            alt="Akwaluzto Campaign"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 cinematic-overlay" />
        </div>
        <div className="relative z-10 w-full px-8 lg:px-20 pb-28 lg:pb-44">
          <div className="max-w-5xl">
            <p className="text-xs uppercase tracking-[0.45em] text-cream/70 mb-8">Maison Akwaluzto</p>
            <h1 className="font-serif text-[clamp(4.8rem,12vw,12rem)] text-cream leading-[0.85] mb-10">{homeContent?.heroHeading ?? 'Dressed in Quiet Luxury'}</h1>
            <div className="flex items-center gap-6">
              <Link to={homeContent?.heroButtonLink ?? '/new-arrivals'} className="inline-flex items-center bg-cream text-charcoal-900 border border-charcoal/10 shadow-sm text-xs font-sans tracking-[0.22em] uppercase px-12 py-5 hover:bg-cream/90 transition-colors duration-300">
                {homeContent?.heroButtonText ?? 'New Arrivals'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#151210]">
        <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {heroLinks.map((entry) => (
            <Link key={entry.to} to={entry.to} className="border-b border-cream/25 pb-4 text-sm font-sans tracking-[0.14em] uppercase text-cream/85 hover:border-cream hover:text-cream transition-all duration-300">
              {entry.label}
            </Link>
          ))}
        </div>
        </div>
      </section>

      {homeContent?.showFeatured !== false && featuredProducts.length > 0 && (
        <section className="bg-[#1a1512]">
          <div className="max-w-8xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
            <div className="text-cream">
              <p className="text-2xs font-sans tracking-[0.4em] uppercase text-cream/45 mb-4">{homeContent?.sections?.[0]?.label ?? 'The Edit'}</p>
              <h2 className="font-serif text-4xl lg:text-5xl">{homeContent?.sections?.[0]?.title ?? 'Available Now'}</h2>
            </div>
            <Link to={homeContent?.sections?.[0]?.ctaLink ?? '/new-arrivals'} className="text-2xs font-sans tracking-[0.15em] uppercase text-cream border-b border-cream/60 pb-px hover:text-cream/80 hover:border-cream transition-all duration-300 whitespace-nowrap">
              {homeContent?.sections?.[0]?.ctaLabel ?? 'View New Arrivals'}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-14">
            {(homeContent?.sections?.[0]?.products?.length ? homeContent.sections[0].products : featuredProducts).slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          </div>
        </section>
      )}

      <section className="bg-charcoal px-6 lg:px-12 py-12">
        <div className="max-w-8xl mx-auto">
          <RecommendationWidget
            type={isAuthenticated ? 'personalized' : 'trending'}
            fallbackTypes={isAuthenticated ? ['trending'] : undefined}
            limit={4}
            ctaLabel="View All Recommendations"
            ctaTo="/recommendations"
          />
        </div>
      </section>

      {homeContent?.showNewsletter !== false && <section className="bg-charcoal py-24 lg:py-32">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-2xs font-sans tracking-[0.4em] uppercase text-cream/40 mb-5">{homeContent?.newsletterLabel ?? 'Newsletter'}</p>
          <h2 className="font-serif text-4xl lg:text-5xl text-cream mb-6">{homeContent?.newsletterHeading ?? 'Stay in the Conversation'}</h2>
          <NewsletterForm />
        </div>
      </section>}
    </>
  )
}
