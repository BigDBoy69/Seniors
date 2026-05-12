import { request } from './transport'
import type { Product } from './api'

export interface NavigationItem {
  id: string
  label: string
  path: string
  location: string
  visible: boolean
  sortOrder: number
  openInNewTab: boolean
}

export interface DivisionCategory {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  visible: boolean
  sortOrder: number
}

export interface Division {
  id: string
  key: string
  title: string
  intro: string
  image: string | null
  visible: boolean
  sortOrder: number
  categories: DivisionCategory[]
}

export interface HomePageSection {
  id: string
  key: string
  label: string | null
  title: string
  subtitle: string | null
  ctaLabel: string | null
  ctaLink: string | null
  visible: boolean
  sortOrder: number
  products: Product[]
}

export interface HomePageContent {
  id: string
  heroHeading: string
  heroSubtext: string | null
  heroImage: string | null
  heroButtonText: string
  heroButtonLink: string
  showFeatured: boolean
  showNewsletter: boolean
  newsletterLabel: string
  newsletterHeading: string
  newsletterSubtext: string | null
  sections: HomePageSection[]
}

export interface SiteSettings {
  id: string
  newsletterLabel: string
  newsletterHeading: string
  newsletterText: string | null
  contactEmail: string | null
  contactPhone: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  tiktokUrl: string | null
}

export interface StorefrontConfig {
  navigation: NavigationItem[]
  settings: SiteSettings
  homepage: HomePageContent
  divisions: Division[]
}

export async function getStorefrontConfig(): Promise<StorefrontConfig> {
  return request('/api/site/config')
}

export async function getDivisionConfig(key: string): Promise<Division> {
  const { division } = await request<{ division: Division }>(`/api/site/divisions/${key}`)
  return division
}
