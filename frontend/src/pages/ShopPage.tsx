import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { getCatalogMeta, getProducts, type Product } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'
import { ShopFilters } from '@/components/shop/ShopFilters'

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  const clearFilters = () => setSearchParams(new URLSearchParams(filters.sort ? { sort: filters.sort } : {}))

  const activeFilterCount = [filters.category, filters.size, filters.status].filter(Boolean).length

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

      {/* Mobile filter bar */}
      <div className="lg:hidden sticky top-[4.5rem] z-30 bg-[#151210]/95 backdrop-blur-sm border-b border-cream/10 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 text-xs font-sans tracking-widest uppercase text-cream/70 hover:text-cream transition-colors"
        >
          <SlidersHorizontal size={15} strokeWidth={1.5} />
          Filter & Sort
          {activeFilterCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-cream text-charcoal text-[10px] font-medium flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-2xs font-sans tracking-widest uppercase text-cream/45 hover:text-cream/80 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative bg-[#f8f4ee] rounded-t-2xl max-h-[82vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-charcoal-100 flex-shrink-0">
              <p className="text-xs font-sans tracking-widest uppercase text-charcoal-500">Filter & Sort</p>
              <button onClick={() => setDrawerOpen(false)} className="text-charcoal p-1">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-6">
              <ShopFilters
                categories={meta.categories}
                sizes={meta.sizes}
                values={filters}
                onChange={(k, v) => { updateFilter(k, v) }}
                onClear={clearFilters}
              />
            </div>
            <div className="flex-shrink-0 px-6 py-5 border-t border-charcoal-100">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full bg-charcoal text-cream py-4 text-xs font-sans tracking-widest uppercase hover:bg-charcoal/90 transition-colors"
              >
                Show {products.length} {products.length === 1 ? 'piece' : 'pieces'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-8xl mx-auto px-6 lg:px-12 pb-24 flex gap-12">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-28 luxury-surface p-5">
            <ShopFilters
              categories={meta.categories}
              sizes={meta.sizes}
              values={filters}
              onChange={updateFilter}
              onClear={clearFilters}
            />
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cream" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <p className="font-serif text-3xl text-cream">No pieces found</p>
              <p className="text-sm font-sans text-cream/65">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-10 lg:gap-x-6 lg:gap-y-12">
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
