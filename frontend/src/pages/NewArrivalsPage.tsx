import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, type Product } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'
import { getDivisionConfig } from '@/lib/storefront'

export function NewArrivalsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [title, setTitle] = useState('New Arrivals')
  const [intro, setIntro] = useState('A rotating edit of the newest pieces across men, women, and accessories.')

  useEffect(() => {
    Promise.all([getProducts({ sort: 'newest', newArrivals: 'true' }), getDivisionConfig('new-arrivals')])
      .then(([list, division]) => {
        setProducts(list.slice(0, 24))
        setTitle(division.title)
        setIntro(division.intro)
      })
      .catch(() => {
        setProducts([])
      })
  }, [])

  useEffect(() => {
    if (products.length > 0) return
    getProducts({ sort: 'newest' })
      .then((list) => setProducts(list.slice(0, 24)))
      .catch(() => setProducts([]))
  }, [])

  return (
    <div className="min-h-screen pt-20 bg-[#140f0d]">
      <section className="relative h-[85svh] min-h-[640px] flex items-end overflow-hidden">
        <img
          src="/images/new-arrivals.jpeg"
          alt="New Arrivals"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 cinematic-overlay" />
        <div className="relative z-10 w-full max-w-8xl mx-auto px-6 lg:px-12 pb-20 lg:pb-28">
          <p className="text-xs font-sans tracking-[0.45em] uppercase text-cream/65 mb-6">Catalog</p>
          <h1 className="font-serif text-[clamp(3.2rem,8vw,8.5rem)] text-cream leading-[0.9] mb-6">{title}</h1>
          <p className="text-lg font-sans text-cream/75 leading-relaxed max-w-2xl">
            {intro}
          </p>
        </div>
      </section>

      <section className="max-w-8xl mx-auto px-6 lg:px-12 pb-28">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-5 text-center">
            <p className="font-serif text-4xl text-cream">No new pieces yet</p>
            <p className="text-base font-sans text-cream/70">Please check back shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-14">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <div className="pt-20 text-center">
          <Link to="/men" className="text-2xs font-sans tracking-[0.15em] uppercase text-cream border-b border-cream/70 pb-px hover:text-cream/80 hover:border-cream transition-all duration-300">
            Browse by Division
          </Link>
        </div>
      </section>
    </div>
  )
}
