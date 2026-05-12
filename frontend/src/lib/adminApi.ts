import { BASE } from './transport'
import type { Category, Product, ProductStatus, ProductVariant } from './api'

const TOKEN_KEY = 'akwaluzto_admin_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function headers() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers(), ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = (body as { error?: string }).error ?? `Request failed: ${res.status}`
    const err = new Error(message) as Error & { status: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  active: boolean
}

export interface Division {
  id: string
  key: string
  title: string
  intro: string
  image: string | null
  visible: boolean
  sortOrder: number
}

export interface Collection {
  id: string
  title: string
  slug: string
  intro: string | null
  image: string | null
  visible: boolean
  sortOrder: number
  divisionId: string | null
  products: Array<{ product: Product }>
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
  sections: Array<{
    id: string
    key: string
    label: string | null
    title: string
    subtitle: string | null
    ctaLabel: string | null
    ctaLink: string | null
    visible: boolean
    sortOrder: number
    sectionType: string
    products: Array<{ product: Product }>
  }>
}

export interface NavigationItem {
  id?: string
  label: string
  path: string
  location: string
  visible: boolean
  sortOrder: number
  openInNewTab: boolean
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
  defaultDeliveryInfo: string | null
  defaultShippingInfo: string | null
  defaultReturnsInfo: string | null
}

export interface ProductInfoInput {
  subtitle?: string | null
  material?: string | null
  productDetails?: string | null
  collectionNote?: string | null
  sizeGuideType?: string | null
  sizeGuideContent?: string | null
  sizeGuideUrl?: string | null
  deliveryInfo?: string | null
  shippingInfo?: string | null
  returnsInfo?: string | null
  infoCardTitle?: string | null
  infoCardBody?: string | null
  infoCardImage?: string | null
  infoCardCtaLabel?: string | null
  infoCardCtaUrl?: string | null
}

export interface MediaAsset {
  id: string
  title: string | null
  alt: string | null
  url: string
  mimeType: string | null
  source: string
  size: number | null
  createdAt: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string
  city: string | null
  area: string | null
  address: string | null
  createdAt: string
  _count: { orders: number }
}

export interface AdminOrder {
  id: string
  orderNumber: string
  status: 'PENDING' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  customerName: string
  customerEmail?: string | null
  phone: string
  total: number
  createdAt: string
}

export interface AdminProductInput {
  name: string
  slug: string
  description?: string
  price: number
  compareAtPrice?: number | null
  images: string[]
  divisionId?: string | null
  categoryId?: string | null
  status: ProductStatus
  featured: boolean
  isNewArrival: boolean
  sortOrder: number
  variants: Array<Pick<ProductVariant, 'size' | 'color' | 'colorHex' | 'stock' | 'reserved' | 'sku'>>
  info?: ProductInfoInput | null
}

export function setAdminToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

export async function adminLogin(email: string, password: string) {
  const result = await adminRequest<{ token: string; admin: AdminUser }>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAdminToken(result.token)
  return result
}

export async function getCurrentAdmin() {
  return adminRequest<{ admin: AdminUser }>('/api/admin/auth/me')
}

export async function getAdminDashboard() {
  return adminRequest('/api/admin/cms/dashboard')
}

export async function getAdminProducts() {
  return adminRequest<{ products: Product[] }>('/api/admin/products')
}

export async function createAdminProduct(payload: AdminProductInput) {
  return adminRequest('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateAdminProduct(id: string, payload: Partial<AdminProductInput>) {
  return adminRequest(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function archiveAdminProduct(id: string) {
  return adminRequest(`/api/admin/products/${id}`, { method: 'DELETE' })
}

export async function unarchiveAdminProduct(id: string) {
  return adminRequest(`/api/admin/products/${id}/unarchive`, { method: 'POST' })
}

export async function hardDeleteAdminProduct(id: string) {
  return adminRequest(`/api/admin/products/${id}/hard`, { method: 'DELETE' })
}

export async function getAdminDivisions() {
  return adminRequest<{ divisions: Division[] }>('/api/admin/cms/divisions')
}

export async function saveDivision(payload: Partial<Division> & { id?: string }) {
  if (payload.id) {
    return adminRequest(`/api/admin/cms/divisions/${payload.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }
  return adminRequest('/api/admin/cms/divisions', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteDivision(id: string) {
  return adminRequest(`/api/admin/cms/divisions/${id}`, { method: 'DELETE' })
}

export async function getAdminCategories() {
  return adminRequest<{ categories: Category[] }>('/api/admin/cms/categories')
}

export async function saveCategory(payload: Partial<Category> & { id?: string }) {
  if (payload.id) {
    return adminRequest(`/api/admin/cms/categories/${payload.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }
  return adminRequest('/api/admin/cms/categories', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteCategory(id: string, action?: 'reassign' | 'unassign', targetCategoryId?: string) {
  const body: Record<string, string> = {}
  if (action) body.action = action
  if (targetCategoryId) body.targetCategoryId = targetCategoryId

  return adminRequest(`/api/admin/cms/categories/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(body),
  })
}

export async function getCategoryProductCount(id: string) {
  return adminRequest<{
    categoryId: string
    categoryName: string
    productCount: number
    sampleProducts: Array<{ id: string; name: string; slug: string }>
  }>(`/api/admin/cms/categories/${id}/products-count`)
}

export async function getAdminCollections() {
  return adminRequest<{ collections: Collection[] }>('/api/admin/cms/collections')
}

export async function saveCollection(payload: Partial<Collection> & { id?: string; productIds?: string[] }) {
  if (payload.id) {
    return adminRequest(`/api/admin/cms/collections/${payload.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }
  return adminRequest('/api/admin/cms/collections', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteCollection(id: string) {
  return adminRequest(`/api/admin/cms/collections/${id}`, { method: 'DELETE' })
}

export async function getHomepageContent() {
  return adminRequest<{ homepage: HomePageContent }>('/api/admin/cms/homepage')
}

export async function updateHomepageContent(payload: Partial<HomePageContent>) {
  return adminRequest('/api/admin/cms/homepage', { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function saveHomepageSection(payload: {
  id?: string
  key: string
  label?: string | null
  title: string
  subtitle?: string | null
  ctaLabel?: string | null
  ctaLink?: string | null
  visible: boolean
  sortOrder: number
  sectionType?: string
  productIds: string[]
}) {
  return adminRequest('/api/admin/cms/homepage/sections', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteHomepageSection(id: string) {
  return adminRequest(`/api/admin/cms/homepage/sections/${id}`, { method: 'DELETE' })
}

export async function getNavigationItems() {
  return adminRequest<{ items: NavigationItem[] }>('/api/admin/cms/navigation')
}

export async function saveNavigationItems(items: NavigationItem[]) {
  return adminRequest('/api/admin/cms/navigation', { method: 'PUT', body: JSON.stringify({ items }) })
}

export async function getSiteSettings() {
  return adminRequest<{ settings: SiteSettings }>('/api/admin/cms/settings')
}

export async function updateSiteSettings(payload: Partial<SiteSettings>) {
  return adminRequest('/api/admin/cms/settings', { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function getMediaAssets() {
  return adminRequest<{ assets: MediaAsset[] }>('/api/admin/cms/media')
}

export async function createMediaAsset(payload: Partial<MediaAsset> & { url: string }) {
  return adminRequest('/api/admin/cms/media', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteMediaAsset(id: string) {
  return adminRequest(`/api/admin/cms/media/${id}`, { method: 'DELETE' })
}

export async function getCustomers() {
  return adminRequest<{ customers: Customer[] }>('/api/admin/cms/customers')
}

export async function getAdminOrders() {
  return adminRequest<{ orders: AdminOrder[] }>('/api/admin/orders')
}

export async function updateAdminOrderStatus(id: string, status: AdminOrder['status']) {
  return adminRequest(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export async function getAdminUsers() {
  return adminRequest<{ admins: AdminUser[] }>('/api/admin/cms/admins')
}

export async function saveAdminUser(payload: Partial<AdminUser> & { id?: string; password?: string }) {
  if (payload.id) {
    return adminRequest(`/api/admin/cms/admins/${payload.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }
  return adminRequest('/api/admin/cms/admins', { method: 'POST', body: JSON.stringify(payload) })
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('image', file)

  const token = getToken()
  const res = await fetch(`${BASE}/api/admin/upload/image`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Upload failed: ${res.status}`)
  }

  return res.json()
}

export async function uploadImages(files: File[]): Promise<{ urls: string[] }> {
  const formData = new FormData()
  files.forEach((file) => formData.append('images', file))

  const token = getToken()
  const res = await fetch(`${BASE}/api/admin/upload/images`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Upload failed: ${res.status}`)
  }

  return res.json()
}

// ========================================
// NEWSLETTER
// ========================================

export interface NewsletterSubscriber {
  id: string
  email: string
  source: string | null
  active: boolean
  unsubscribeToken: string | null
  unsubscribedAt: string | null
  createdAt: string
}

export interface NewsletterStats {
  total: number
  active: number
  unsubscribed: number
}

export async function getNewsletterSubscribers() {
  return adminRequest<{ subscribers: NewsletterSubscriber[]; stats: NewsletterStats }>('/api/admin/newsletter/subscribers')
}

export async function sendNewsletter(payload: {
  subject: string
  heading: string
  body: string
  ctaLabel?: string
  ctaLink?: string
}) {
  return adminRequest<{ 
    success: boolean
    totalSubscribers: number
    successCount: number
    failureCount: number
  }>('/api/admin/newsletter/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
