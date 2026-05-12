import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDivisionConfig, type Division } from '@/lib/storefront'

export function CatalogDivisionPage({ divisionKey }: { divisionKey?: string }) {
  const { division } = useParams()
  const key = divisionKey ?? division
  const [data, setData] = useState<Division | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!key) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    getDivisionConfig(key)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [key])

  if (loading) {
    return <div className="min-h-screen pt-24" />
  }

  if (!data) {
    return (
      <div className="min-h-screen pt-24">
        <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16">
          <h1 className="font-serif text-5xl">Division not found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 bg-[#130f0d]">
      <section className="relative h-[95svh] min-h-[720px] flex items-end overflow-hidden">
        <img src={data.image ?? '/images/hero.jpeg'} alt={data.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 cinematic-overlay" />
        <div className="relative z-10 w-full max-w-8xl mx-auto px-6 lg:px-12 pb-20 lg:pb-28">
          <p className="text-xs font-sans tracking-[0.45em] uppercase text-cream/65 mb-6">Catalog</p>
          <h1 className="font-serif text-[clamp(3.5rem,8vw,8rem)] text-cream leading-[0.9] mb-6">{data.title}</h1>
          <p className="text-lg font-sans text-cream/75 max-w-2xl leading-relaxed">{data.intro}</p>
        </div>
      </section>

      <section className="max-w-8xl mx-auto px-6 lg:px-12 py-24 lg:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 lg:gap-12">
          {data.categories.map((category) => (
            <Link key={category.slug} to={`/${data.key}/${category.slug}`} className="group block">
              <div className="relative aspect-3/4 overflow-hidden bg-cream-200 mb-5">
                <img src={category.image ?? '/images/category-1.jpeg'} alt={category.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-charcoal/10 to-transparent" />
              </div>
              <div className="luxury-surface p-5 border border-charcoal-100">
                <h2 className="font-serif text-3xl mb-2.5 group-hover:text-taupe-dark transition-colors duration-300">{category.name}</h2>
                <p className="text-base font-sans text-charcoal-300 leading-relaxed">{category.description ?? ''}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
