export type DivisionKey = 'men' | 'women' | 'accessories'

export type CatalogCategory = {
  slug: string
  title: string
  description: string
  image: string
  queryCategory?: string
}

export type DivisionConfig = {
  key: DivisionKey
  title: string
  intro: string
  image: string
  categories: CatalogCategory[]
}

export const DIVISIONS: Record<DivisionKey, DivisionConfig> = {
  men: {
    key: 'men',
    title: 'Men',
    intro: 'Tailored essentials and contemporary silhouettes for everyday wear.',
    image: '/images/men-division.jpeg',
    categories: [
      { slug: 'ready-to-wear', title: 'Ready to Wear', description: 'Core garments for daily rotation.', image: '/images/category-1.jpeg', queryCategory: 'ready-to-wear' },
      { slug: 'outerwear', title: 'Outerwear', description: 'Refined layers for cooler days.', image: '/images/category-2.jpeg', queryCategory: 'outerwear' },
      { slug: 'tops', title: 'Tops', description: 'Shirts, tees, and elevated basics.', image: '/images/category-3.jpeg', queryCategory: 'tops' },
      { slug: 'bottoms', title: 'Bottoms', description: 'Structured and relaxed foundations.', image: '/images/category-4.jpeg', queryCategory: 'bottoms' },
      { slug: 'knitwear', title: 'Knitwear', description: 'Soft texture, clean lines.', image: '/images/category-5.jpeg', queryCategory: 'knitwear' },
      { slug: 'shoes', title: 'Shoes', description: 'Minimal footwear selection.', image: '/images/category-6.jpeg', queryCategory: 'shoes' },
    ],
  },
  women: {
    key: 'women',
    title: 'Women',
    intro: 'Editorial pieces balancing softness, structure, and movement.',
    image: '/images/women-division.jpeg',
    categories: [
      { slug: 'ready-to-wear', title: 'Ready to Wear', description: 'Seasonal staples with an elevated finish.', image: '/images/category-1.jpeg', queryCategory: 'ready-to-wear' },
      { slug: 'outerwear', title: 'Outerwear', description: 'Statement layers and clean tailoring.', image: '/images/category-2.jpeg', queryCategory: 'outerwear' },
      { slug: 'tops', title: 'Tops', description: 'Layering pieces and stand-alone forms.', image: '/images/category-3.jpeg', queryCategory: 'tops' },
      { slug: 'bottoms', title: 'Bottoms', description: 'From precise cuts to fluid drape.', image: '/images/category-4.jpeg', queryCategory: 'bottoms' },
      { slug: 'knitwear', title: 'Knitwear', description: 'Soft volume and subtle texture.', image: '/images/category-5.jpeg', queryCategory: 'knitwear' },
      { slug: 'shoes', title: 'Shoes', description: 'Essential pairs for day and evening.', image: '/images/category-6.jpeg', queryCategory: 'shoes' },
    ],
  },
  accessories: {
    key: 'accessories',
    title: 'Accessories',
    intro: 'Quiet accents designed to complete each look.',
    image: '/images/accessories-division.jpeg',
    categories: [
      { slug: 'bags', title: 'Bags', description: 'Functional silhouettes with premium finish.', image: '/images/category-1.jpeg', queryCategory: 'bags' },
      { slug: 'jewellery', title: 'Jewellery', description: 'Minimal pieces with character.', image: '/images/category-2.jpeg', queryCategory: 'jewellery' },
      { slug: 'small-goods', title: 'Small Goods', description: 'Belts, wallets, and other accessories.', image: '/images/category-3.jpeg', queryCategory: 'accessories' },
    ],
  },
}

export function getDivision(key?: string): DivisionConfig | null {
  if (!key) return null
  return DIVISIONS[key as DivisionKey] ?? null
}

export function getDivisionCategory(division: DivisionConfig, categorySlug?: string): CatalogCategory | null {
  if (!categorySlug) return null
  return division.categories.find((c) => c.slug === categorySlug) ?? null
}
