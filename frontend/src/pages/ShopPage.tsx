import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCatalogMeta, getProducts, type Product } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'
import { ShopFilters } from '@/components/shop/ShopFilters'

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<{ categories: { id: string; name: string; slug: string }[]; sizes: string[]; colors: string[] }>({
    categories: [],
    sizes: [],
    colors: [],
  })

  const filters = useMemo(
    () => ({
      category: searchParams.get('category') ?? undefined,
      size: searchParams.get('size') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    }),
    [searchParams],
  )

  useEffect(() => {
    setLoading(true)
    getProducts(filters)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => {
    getCatalogMeta()
      .then(setMeta)
      .catch(() => setMeta({ categories: [], sizes: [], colors: [] }))
  }, [])

  const updateFilter = (key: 'category' | 'size' | 'status' | 'sort', value?: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  return (
    <div className="min-h-screen pt-20 bg-[#151210] text-cream">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 pt-18 pb-12">
        <p className="text-2xs font-sans tracking-[0.35em] uppercase text-cream/40 mb-3">Akwaluzto</p>
        <h1 className="font-serif text-5xl lg:text-6xl">
          {filters.search ? `Results for "${filters.search}"` : 'Curated Selection'}
        </h1>
        <p className="text-sm font-sans text-cream/65 mt-3">
          {loading ? '' : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}
        </p>
      </div>
      <div className="max-w-8xl mx-auto px-6 lg:px-12 pb-24 flex gap-12">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-28 luxury-surface p-5">
            <ShopFilters
              categories={meta.categories}
              sizes={meta.sizes}
              values={filters}
              onChange={updateFilter}
              onClear={() => setSearchParams(new URLSearchParams(filters.sort ? { sort: filters.sort } : {}))}
            />
          </div>
        </aside>
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cream"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <p className="font-serif text-3xl text-cream">No pieces found</p>
              <p className="text-sm font-sans text-cream/65">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
