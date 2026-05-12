import { request } from './transport'

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'SOLD_OUT' | 'ARCHIVED' | 'AVAILABLE' | 'LIMITED' | 'COMING_SOON' | 'PRE_ORDER'

export interface ProductInfo {
  id: string
  subtitle: string | null
  material: string | null
  productDetails: string | null
  collectionNote: string | null
  sizeGuideType: 'text' | 'url' | null
  sizeGuideContent: string | null
  sizeGuideUrl: string | null
  deliveryInfo: string | null
  shippingInfo: string | null
  returnsInfo: string | null
  infoCardTitle: string | null
  infoCardBody: string | null
  infoCardImage: string | null
  infoCardCtaLabel: string | null
  infoCardCtaUrl: string | null
}

export interface StorePolicy {
  defaultDeliveryInfo: string | null
  defaultShippingInfo: string | null
  defaultReturnsInfo: string | null
}

export interface ProductVariant {
  id: string
  size: string | null
  color: string | null
  colorHex: string | null
  stock: number
  reserved: number
  sku: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
  visible?: boolean
  sortOrder?: number
  divisionId?: string | null
  division?: { id: string; key: string; title: string } | null
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  compareAtPrice: number | null
  images: string[]
  division?: { id: string; key: string; title: string } | null
  category: Category | null
  fabric: string | null
  careInstructions: string | null
  fitNotes: string | null
  status: ProductStatus
  featured: boolean
  isNewArrival?: boolean
  sortOrder?: number
  variants: ProductVariant[]
  productInfo?: ProductInfo | null
}

export interface ShopFilters {
  category?: string
  division?: string
  size?: string
  status?: string
  sort?: string
  featured?: string
  newArrivals?: string
  search?: string
}

export async function getProducts(filters?: ShopFilters): Promise<Product[]> {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
  }
  const qs = params.toString()
  const { products } = await request<{ products: Product[] }>(`/api/products${qs ? `?${qs}` : ''}`)
  return products
}

export async function getProduct(slug: string): Promise<{ product: Product; policy: StorePolicy }> {
  return request<{ product: Product; policy: StorePolicy }>(`/api/products/${slug}`)
}

export async function getCatalogMeta(): Promise<{
  categories: Category[]
  sizes: string[]
  colors: string[]
}> {
  return request('/api/products/categories')
}

export type OrderStatus =
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED'

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  size: string | null
  color: string | null
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  customerName: string
  phone: string
  city: string
  area: string | null
  address: string
  notes: string | null
  deliveryNotes: string | null
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: string
  createdAt: string
  items: OrderItem[]
}

export interface CreateOrderPayload {
  customerName: string
  customerEmail?: string
  phone: string
  city: string
  area?: string
  address: string
  notes?: string
  deliveryNotes?: string
  subtotal: number
  total: number
  items: Array<{
    productId: string
    variantId: string | null
    name: string
    price: number
    quantity: number
    size?: string | null
    color?: string | null
  }>
}

export async function createOrder(payload: CreateOrderPayload, token?: string | null): Promise<{ orderId: string; orderNumber: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return request('/api/orders', { 
    method: 'POST', 
    body: JSON.stringify(payload),
    headers 
  })
}

export async function getOrder(
  id: string,
  options?: { token?: string | null; phone?: string | null }
): Promise<Order> {
  const headers: Record<string, string> = {}
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const params = new URLSearchParams()
  if (options?.phone) {
    params.set('phone', options.phone)
  }
  const qs = params.toString()

  const { order } = await request<{ order: Order }>(
    `/api/orders/${id}${qs ? `?${qs}` : ''}`,
    { headers }
  )
  return order
}

export async function subscribeNewsletter(email: string, source?: string): Promise<void> {
  await request('/api/newsletter', { method: 'POST', body: JSON.stringify({ email, source }) })
}

// ─── User Auth ────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  role: string
  emailVerified: string | null
}

export interface AuthResponse {
  token: string
  user: User
}

export async function signup(email: string, password: string, firstName?: string, lastName?: string, phone?: string): Promise<AuthResponse> {
  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, firstName, lastName, phone }),
  })
}

export async function signin(email: string, password: string): Promise<AuthResponse> {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function getCurrentUser(token: string): Promise<{ user: User }> {
  return request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  return request('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function requestAccountDeletion(token: string): Promise<{ message: string }> {
  return request('/api/auth/request-deletion', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function confirmAccountDeletion(deleteToken: string): Promise<{ success: boolean; message: string }> {
  return request(`/api/auth/confirm-deletion?token=${encodeURIComponent(deleteToken)}`)
}

export async function getProfile(token: string): Promise<{ user: User & { addresses: Address[]; stats: { wishlistCount: number; orderCount: number } } }> {
  return request('/api/account/profile', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function updateProfile(token: string, data: { firstName?: string; lastName?: string; phone?: string }): Promise<{ user: User }> {
  return request('/api/account/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
}

export async function changePassword(token: string, currentPassword: string, newPassword: string): Promise<void> {
  await request('/api/account/profile/password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export interface Address {
  id: string
  firstName: string | null
  lastName: string | null
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string | null
  country: string
  phone: string | null
  isDefaultShipping: boolean
  isDefaultBilling: boolean
  createdAt: string
}

export async function getAddresses(token: string): Promise<{ addresses: Address[] }> {
  return request('/api/account/addresses', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function createAddress(token: string, data: Omit<Address, 'id' | 'createdAt'>): Promise<{ address: Address }> {
  return request('/api/account/addresses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
}

export async function updateAddress(token: string, id: string, data: Partial<Omit<Address, 'id' | 'createdAt'>>): Promise<{ address: Address }> {
  return request(`/api/account/addresses/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
}

export async function deleteAddress(token: string, id: string): Promise<void> {
  await request(`/api/account/addresses/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string
  addedAt: string
  variantId: string | null
  product: {
    id: string
    name: string
    slug: string
    price: number
    compareAtPrice: number | null
    images: string[]
    status: ProductStatus
    category: { name: string; slug: string } | null
  }
}

export async function getWishlist(token: string): Promise<{ items: WishlistItem[] }> {
  return request('/api/account/wishlist', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function addToWishlist(token: string, productId: string, variantId?: string): Promise<{ item: WishlistItem }> {
  return request('/api/account/wishlist', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId, variantId }),
  })
}

export async function removeFromWishlist(token: string, id: string): Promise<void> {
  await request(`/api/account/wishlist/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ─── User Orders ───────────────────────────────────────────────────────────────

export interface UserOrder {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: string
  createdAt: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    size: string | null
    color: string | null
    product: {
      id: string
      name: string
      slug: string
      images: string[]
    }
    variant: ProductVariant | null
  }>
  shippingAddress: Address | null
}

export async function getUserOrders(token: string): Promise<{ orders: UserOrder[] }> {
  return request('/api/account/orders', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getUserOrder(token: string, id: string): Promise<{ order: UserOrder }> {
  return request(`/api/account/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ─── Contact ───────────────────────────────────────────────────────────────────

// ─── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  token?: string | null,
): Promise<{ reply: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return request('/api/chat/message', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history }),
  })
}

export async function submitContact(data: {
  name: string
  email: string
  phone?: string
  topic?: string
  subject?: string
  message: string
}): Promise<void> {
  await request('/api/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
