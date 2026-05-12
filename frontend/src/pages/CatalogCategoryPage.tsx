import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getProducts, type Product } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'
import { getDivisionConfig, type Division } from '@/lib/storefront'

export function CatalogCategoryPage({ divisionKey }: { divisionKey?: string }) {
  const { division: divisionParam, category: categoryParam } = useParams()
  const [divisionData, setDivisionData] = useState<Division | null>(null)
  const [divisionLoading, setDivisionLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  // categoryData is used only for hero display — product fetching does not depend on it.
  const categoryData = divisionData?.categories.find((entry) => entry.slug === categoryParam) ?? null

  // Division config: used for breadcrumb and category hero display only.
  useEffect(() => {
    const key = divisionKey ?? divisionParam
    if (!key) {
      setDivisionData(null)
      setDivisionLoading(false)
      return
    }
    setDivisionLoading(true)
    getDivisionConfig(key)
      .then(setDivisionData)
      .catch(() => setDivisionData(null))
      .finally(() => setDivisionLoading(false))
  }, [divisionKey, divisionParam])

  // Products: fetched directly by the category slug from the URL.
  // This is independent of the division config so that a hidden or missing
  // division never causes the product list to be cleared.
  useEffect(() => {
    if (!categoryParam) {
      setProducts([])
      setProductsLoading(false)
      return
    }
    setProductsLoading(true)
    getProducts({ category: categoryParam })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false))
  }, [categoryParam])

  // Show a blank placeholder while the initial fetch is in progress.
  if (divisionLoading) {
    return <div className="min-h-screen pt-24" />
  }

  // If the division or category could not be found, show a graceful error
  // that still includes any products that could be resolved by slug.
  if (!divisionData || !categoryData) {
    return (
      <div className="min-h-screen pt-24 bg-[#15110f] text-cream">
        <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16">
          <h1 className="font-serif text-5xl mb-10">Category not found</h1>
          {!productsLoading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-14">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 bg-[#15110f]">
      <section className="relative h-[75svh] min-h-[560px] flex items-end overflow-hidden">
        <img
          src={categoryData.image ?? '/images/category-1.jpeg'}
          alt={categoryData.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15110f]/95 via-[#15110f]/40 to-transparent" />
        <div className="relative z-10 w-full max-w-8xl mx-auto px-6 lg:px-12 pb-16 lg:pb-24">
          <p className="text-xs font-sans tracking-[0.45em] uppercase text-cream/55 mb-5">
            <Link to={`/${divisionData.key}`} className="hover:text-cream transition-colors duration-300">
              {divisionData.title}
            </Link>
          </p>
          <h1 className="font-serif text-[clamp(3rem,7vw,7rem)] text-cream leading-[0.9] mb-5">{categoryData.name}</h1>
          <p className="text-lg font-sans text-cream/70 leading-relaxed max-w-2xl">{categoryData.description}</p>
        </div>
      </section>

      <div className="max-w-8xl mx-auto px-6 lg:px-12 pb-28">
        {productsLoading ? (
          <div className="flex items-center justify-center py-28">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cream" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-5 text-center">
            <p className="font-serif text-4xl text-cream">No pieces currently available</p>
            <p className="text-base font-sans text-cream/70">Please check again soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-14">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
