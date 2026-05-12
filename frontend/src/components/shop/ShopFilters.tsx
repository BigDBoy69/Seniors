import type { ReactNode } from 'react'
import type { Category } from '@/lib/api'

type Props = {
  categories: Category[]
  sizes: string[]
  values: { category?: string; size?: string; status?: string; sort?: string }
  onChange: (key: 'category' | 'size' | 'status' | 'sort', value?: string) => void
  onClear: () => void
}

export function ShopFilters({ categories, sizes, values, onChange, onClear }: Props) {
  const Btn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
    <button onClick={onClick} className={`text-sm font-sans text-left transition-colors duration-200 ${active ? 'text-charcoal font-medium' : 'text-charcoal-500 hover:text-charcoal'}`}>
      {children}
    </button>
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-2xs font-sans tracking-widest uppercase text-charcoal-500 mb-4">Sort</p>
        <div className="flex flex-col gap-2">
          {[
            ['newest', 'Newest'],
            ['price-asc', 'Price: Low → High'],
            ['price-desc', 'Price: High → Low'],
            ['name-asc', 'Name A–Z'],
          ].map(([v, l]) => (
            <Btn key={v} active={values.sort === v} onClick={() => onChange('sort', values.sort === v ? undefined : v)}>
              {l}
            </Btn>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <p className="text-2xs font-sans tracking-widest uppercase text-charcoal-500 mb-4">Category</p>
          <div className="flex flex-col gap-2">
            {categories.map((c) => (
              <Btn key={c.id} active={values.category === c.slug} onClick={() => onChange('category', values.category === c.slug ? undefined : c.slug)}>
                {c.name}
              </Btn>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-2xs font-sans tracking-widest uppercase text-charcoal-500 mb-4">Availability</p>
        <div className="flex flex-col gap-2">
          {[
            ['AVAILABLE', 'In Stock'],
            ['LIMITED', 'Limited'],
            ['PRE_ORDER', 'Pre-Order'],
            ['COMING_SOON', 'Coming Soon'],
          ].map(([v, l]) => (
            <Btn key={v} active={values.status === v} onClick={() => onChange('status', values.status === v ? undefined : v)}>
              {l}
            </Btn>
          ))}
        </div>
      </div>

      {sizes.length > 0 && (
        <div>
          <p className="text-2xs font-sans tracking-widest uppercase text-charcoal-500 mb-4">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => onChange('size', values.size === s ? undefined : s)}
                className={`min-w-[2.5rem] px-2 py-1.5 text-2xs font-sans border transition-all ${values.size === s ? 'bg-charcoal text-cream border-charcoal' : 'border-charcoal-200 text-charcoal hover:border-charcoal'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {(values.category || values.size || values.status) && (
        <button onClick={onClear} className="flex items-center gap-2 text-2xs font-sans tracking-widest uppercase text-charcoal-500 hover:text-charcoal transition-colors">
          Clear Filters
        </button>
      )}
    </div>
  )
}
