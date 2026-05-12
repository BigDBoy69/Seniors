import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VariantEditor, type VariantRow } from '@/components/admin/VariantEditor'
import {
  AdminOrder,
  AdminProductInput,
  AdminUser,
  Collection,
  Customer,
  Division,
  MediaAsset,
  NavigationItem,
  SiteSettings,
  archiveAdminProduct,
  unarchiveAdminProduct,
  createAdminProduct,
  createMediaAsset,
  deleteCategory,
  deleteCollection,
  deleteDivision,
  deleteHomepageSection,
  deleteMediaAsset,
  getAdminCategories,
  getAdminDashboard,
  getAdminDivisions,
  getAdminOrders,
  getAdminProducts,
  getAdminUsers,
  getAdminCollections,
  getCategoryProductCount,
  getCurrentAdmin,
  getCustomers,
  getHomepageContent,
  getMediaAssets,
  getNavigationItems,
  getSiteSettings,
  saveAdminUser,
  saveCategory,
  saveCollection,
  saveDivision,
  saveHomepageSection,
  saveNavigationItems,
  setAdminToken,
  updateAdminOrderStatus,
  updateAdminProduct,
  updateHomepageContent,
  updateSiteSettings,
  uploadImage,
  uploadImages,
  getNewsletterSubscribers,
  sendNewsletter,
  NewsletterSubscriber,
  NewsletterStats,
} from '@/lib/adminApi'
import type { Category, Product } from '@/lib/api'

const SECTIONS = ['Dashboard', 'Products', 'Categories', 'Collections', 'Homepage', 'Navigation', 'Orders', 'Customers', 'Newsletter', 'Media Library', 'Settings'] as const
type SectionKey = (typeof SECTIONS)[number]

const EMPTY_INFO = {
  subtitle: '',
  material: '',
  productDetails: '',
  collectionNote: '',
  sizeGuideType: '' as string,
  sizeGuideContent: '',
  sizeGuideUrl: '',
  deliveryInfo: '',
  shippingInfo: '',
  returnsInfo: '',
  infoCardTitle: '',
  infoCardBody: '',
  infoCardImage: '',
  infoCardCtaLabel: '',
  infoCardCtaUrl: '',
}

const EMPTY_PRODUCT: AdminProductInput = {
  name: '',
  slug: '',
  description: '',
  price: 0,
  compareAtPrice: null,
  images: [],
  divisionId: null,
  categoryId: null,
  status: 'ACTIVE',
  featured: false,
  isNewArrival: false,
  sortOrder: 0,
  variants: [],
  info: { ...EMPTY_INFO },
}

function parseLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [currentSection, setCurrentSection] = useState<SectionKey>('Dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([])
  const [homepage, setHomepage] = useState<any>(null)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState<AdminProductInput>(EMPTY_PRODUCT)
  const [imageLines, setImageLines] = useState('')
  const [productImages, setProductImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [variantRows, setVariantRows] = useState<VariantRow[]>([])
  const [mediaForm, setMediaForm] = useState({ title: '', alt: '', url: '' })
  const [categoryForm, setCategoryForm] = useState<any>({})
  const [divisionForm, setDivisionForm] = useState<any>({})
  const [collectionForm, setCollectionForm] = useState<any>({ productIdsText: '' })
  const [adminForm, setAdminForm] = useState({ email: '', name: '', role: 'EDITOR', password: '' })
  
  // Newsletter state
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [newsletterStats, setNewsletterStats] = useState<NewsletterStats>({ total: 0, active: 0, unsubscribed: 0 })
  const [newsletterForm, setNewsletterForm] = useState({
    subject: '',
    heading: '',
    body: '',
    ctaLabel: '',
    ctaLink: '',
  })
  const [sendingNewsletter, setSendingNewsletter] = useState(false)
  const [newsletterResult, setNewsletterResult] = useState<string | null>(null)

  // Category delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [categoryProductCount, setCategoryProductCount] = useState(0)
  const [deleteAction, setDeleteAction] = useState<'reassign' | 'unassign'>('unassign')
  const [reassignTargetId, setReassignTargetId] = useState<string>('')

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        auth,
        dashboardData,
        productsData,
        divisionsData,
        categoriesData,
        collectionsData,
        homeData,
        navData,
        ordersData,
        customersData,
        mediaData,
        settingsData,
        adminsData,
        newsletterData,
      ] = await Promise.all([
        getCurrentAdmin(),
        getAdminDashboard(),
        getAdminProducts(),
        getAdminDivisions(),
        getAdminCategories(),
        getAdminCollections(),
        getHomepageContent(),
        getNavigationItems(),
        getAdminOrders(),
        getCustomers(),
        getMediaAssets(),
        getSiteSettings(),
        getAdminUsers(),
        getNewsletterSubscribers(),
      ])
      setAdmin(auth.admin)
      setDashboard(dashboardData as Record<string, unknown>)
      setProducts(productsData.products)
      setDivisions(divisionsData.divisions)
      setCategories(categoriesData.categories)
      setCollections(collectionsData.collections)
      setHomepage(homeData.homepage)
      setNavigationItems(navData.items)
      setOrders(ordersData.orders)
      setCustomers(customersData.customers)
      setMedia(mediaData.assets)
      setSettings(settingsData.settings)
      setAdmins(adminsData.admins)
      setSubscribers(newsletterData.subscribers)
      setNewsletterStats(newsletterData.stats)
    } catch (err: any) {
      const status = err?.status as number | undefined
      if (status === 401 || status === 403) {
        setAdminToken(null)
        navigate('/admin/login')
      } else {
        setError(err?.message || 'Failed to load dashboard data. Please refresh to retry.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? '',
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      images: product.images ?? [],
      divisionId: product.division?.id ?? null,
      categoryId: product.category?.id ?? null,
      status: product.status,
      featured: product.featured,
      isNewArrival: product.isNewArrival ?? false,
      sortOrder: product.sortOrder ?? 0,
      variants: product.variants.map((variant) => ({
        size: variant.size,
        color: variant.color,
        colorHex: variant.colorHex,
        stock: variant.stock,
        reserved: variant.reserved,
        sku: variant.sku,
      })),
      info: {
        subtitle:         product.productInfo?.subtitle         ?? '',
        material:         product.productInfo?.material         ?? '',
        productDetails:   product.productInfo?.productDetails   ?? '',
        collectionNote:   product.productInfo?.collectionNote   ?? '',
        sizeGuideType:    product.productInfo?.sizeGuideType    ?? '',
        sizeGuideContent: product.productInfo?.sizeGuideContent ?? '',
        sizeGuideUrl:     product.productInfo?.sizeGuideUrl     ?? '',
        deliveryInfo:     product.productInfo?.deliveryInfo     ?? '',
        shippingInfo:     product.productInfo?.shippingInfo     ?? '',
        returnsInfo:      product.productInfo?.returnsInfo      ?? '',
        infoCardTitle:    product.productInfo?.infoCardTitle    ?? '',
        infoCardBody:     product.productInfo?.infoCardBody     ?? '',
        infoCardImage:    product.productInfo?.infoCardImage    ?? '',
        infoCardCtaLabel: product.productInfo?.infoCardCtaLabel ?? '',
        infoCardCtaUrl:   product.productInfo?.infoCardCtaUrl   ?? '',
      },
    })
    setProductImages(product.images ?? [])
    setImageLines((product.images ?? []).join('\n'))
    setVariantRows(
      product.variants.map((v) => ({
        size: v.size ?? null,
        color: v.color ?? null,
        colorHex: v.colorHex ?? null,
        stock: v.stock ?? 0,
        reserved: v.reserved ?? 0,
        sku: v.sku ?? null,
      }))
    )
  }

  const setInfo = (key: keyof typeof EMPTY_INFO, value: string) => {
    setProductForm(prev => ({ ...prev, info: { ...EMPTY_INFO, ...prev.info, [key]: value } }))
  }

  const resetProductForm = () => {
    setEditingProductId(null)
    setProductForm({ ...EMPTY_PRODUCT, info: { ...EMPTY_INFO } })
    setProductImages([])
    setImageLines('')
    setVariantRows([])
  }

  const submitProduct = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload: AdminProductInput = {
        ...productForm,
        images: productImages,
        variants: variantRows,
      }
      if (editingProductId) await updateAdminProduct(editingProductId, payload)
      else await createAdminProduct(payload)
      resetProductForm()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save product')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    setError(null)
    try {
      const fileArray = Array.from(files)
      const { urls } = await uploadImages(fileArray)
      setProductImages((prev) => [...prev, ...urls])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload images')
    } finally {
      setUploadingImages(false)
    }
  }

  const removeProductImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index))
  }

  const saveNavigation = async () => {
    setSaving(true)
    try {
      await saveNavigationItems(navigationItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save navigation')
    } finally {
      setSaving(false)
    }
  }

  const logout = () => {
    setAdminToken(null)
    navigate('/admin/login')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-900 bg-gray-50">Loading admin...</div>

  return (
    <div className="admin-root min-h-screen bg-gray-50 flex text-gray-900">
      <aside className="w-64 border-r border-gray-200 bg-white p-6 text-gray-900">
        <p className="text-2xs uppercase tracking-[0.35em] text-charcoal-300 mb-2">Akwaluzto</p>
        <h1 className="font-serif text-2xl mb-8">Admin CMS</h1>
        <nav className="space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => setCurrentSection(section)}
              className={`w-full text-left px-3 py-2 text-sm ${currentSection === section ? 'bg-charcoal text-cream' : 'text-charcoal hover:bg-cream-100'}`}
            >
              {section}
            </button>
          ))}
        </nav>
        <div className="mt-10 text-xs text-charcoal-400 space-y-1">
          <p>{admin?.name}</p>
          <p>{admin?.email}</p>
          <button className="mt-3 text-charcoal underline" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 lg:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xs uppercase tracking-[0.35em] text-charcoal-300 mb-2">Content Management</p>
            <h2 className="font-serif text-4xl">{currentSection}</h2>
          </div>
          <button onClick={refresh} className="border border-charcoal px-4 py-2 text-xs uppercase tracking-[0.2em]">
            Refresh
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}

        {currentSection === 'Dashboard' && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries((dashboard?.metrics as Record<string, number>) ?? {}).map(([label, value]) => (
              <div key={label} className="bg-white border border-charcoal-100 p-4">
                <p className="text-2xs uppercase tracking-[0.3em] text-charcoal-300">{label}</p>
                <p className="font-serif text-3xl mt-2">{value}</p>
              </div>
            ))}
          </div>
        )}

        {currentSection === 'Products' && (
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
            <div className="bg-white border border-charcoal-100 p-4 overflow-auto">
              <div className="mb-4 flex items-center justify-between text-sm text-charcoal-400">
                <span>
                  {products.filter(p => p.status === 'ACTIVE').length} live &nbsp;·&nbsp;
                  {products.filter(p => p.status === 'DRAFT').length} draft &nbsp;·&nbsp;
                  {products.filter(p => p.status === 'ARCHIVED').length} archived
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-charcoal-100">
                    <th className="py-2">Product</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className={`border-b border-charcoal-100 ${product.status === 'ARCHIVED' ? 'opacity-40 bg-gray-50' : product.status === 'DRAFT' ? 'bg-yellow-50' : ''}`}>
                      <td className="py-3">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-charcoal-400">{product.slug}</p>
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-1 rounded ${
                          product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          product.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                          product.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td>{product.price.toLocaleString()}</td>
                      <td className="text-right space-x-2">
                        <button className="text-xs underline" onClick={() => startEditProduct(product)}>
                          Edit
                        </button>
                        {product.status === 'ACTIVE' && (
                          <button
                            className="text-xs underline text-yellow-700"
                            onClick={async () => {
                              setSaving(true)
                              setError(null)
                              try {
                                await updateAdminProduct(product.id, { status: 'DRAFT' })
                                await refresh()
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to take down product')
                              } finally {
                                setSaving(false)
                              }
                            }}
                          >
                            Take Down
                          </button>
                        )}
                        {product.status === 'DRAFT' && (
                          <button
                            className="text-xs underline text-green-700"
                            onClick={async () => {
                              setSaving(true)
                              setError(null)
                              try {
                                await updateAdminProduct(product.id, { status: 'ACTIVE' })
                                await refresh()
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to publish product')
                              } finally {
                                setSaving(false)
                              }
                            }}
                          >
                            Publish
                          </button>
                        )}
                        {product.status === 'ARCHIVED' ? (
                          <button
                            className="text-xs underline text-blue-600"
                            onClick={async () => {
                              setSaving(true)
                              setError(null)
                              try {
                                await unarchiveAdminProduct(product.id)
                                await refresh()
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to unarchive product')
                              } finally {
                                setSaving(false)
                              }
                            }}
                          >
                            Unarchive
                          </button>
                        ) : (
                          <button
                            className="text-xs underline text-red-600"
                            onClick={async () => {
                              if (confirm(`Archive "${product.name}"? This permanently removes it from the website.`)) {
                                setSaving(true)
                                setError(null)
                                try {
                                  await archiveAdminProduct(product.id)
                                  await refresh()
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Failed to archive product')
                                } finally {
                                  setSaving(false)
                                }
                              }
                            }}
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form onSubmit={submitProduct} className="bg-white border border-charcoal-100 p-4 space-y-3">
              <h3 className="font-serif text-2xl">{editingProductId ? 'Edit Product' : 'Add Product'}</h3>
              <input className="w-full border px-3 py-2" placeholder="Name" value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} />
              <input className="w-full border px-3 py-2" placeholder="Slug" value={productForm.slug} onChange={(e) => setProductForm((prev) => ({ ...prev, slug: e.target.value }))} />
              <textarea className="w-full border px-3 py-2 min-h-20" placeholder="Description" value={productForm.description} onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className="w-full border px-3 py-2" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: Number(e.target.value) }))} />
                <input type="number" className="w-full border px-3 py-2" placeholder="Sale price" value={productForm.compareAtPrice ?? ''} onChange={(e) => setProductForm((prev) => ({ ...prev, compareAtPrice: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className="w-full border px-3 py-2" value={productForm.divisionId ?? ''} onChange={(e) => setProductForm((prev) => ({ ...prev, divisionId: e.target.value || null }))}>
                  <option value="">Division</option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.title}
                    </option>
                  ))}
                </select>
                <select className="w-full border px-3 py-2" value={productForm.categoryId ?? ''} onChange={(e) => setProductForm((prev) => ({ ...prev, categoryId: e.target.value || null }))}>
                  <option value="">Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className="w-full border px-3 py-2" value={productForm.status} onChange={(e) => setProductForm((prev) => ({ ...prev, status: e.target.value as any }))}>
                  {['ACTIVE', 'DRAFT', 'SOLD_OUT', 'ARCHIVED'].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input type="number" className="w-full border px-3 py-2" placeholder="Sort order" value={productForm.sortOrder} onChange={(e) => setProductForm((prev) => ({ ...prev, sortOrder: Number(e.target.value || 0) }))} />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Product Images</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImages}
                  className="block w-full text-sm border border-charcoal-200 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-charcoal file:text-cream file:text-xs file:uppercase file:tracking-wider hover:file:bg-charcoal-600"
                />
                {uploadingImages && <p className="text-xs text-charcoal-400">Uploading...</p>}
                {productImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {productImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <img src={url} alt={`Product ${index + 1}`} className="w-full h-24 object-cover border" />
                        <button
                          type="button"
                          onClick={() => removeProductImage(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <VariantEditor
                value={variantRows}
                onChange={setVariantRows}
                productSlug={productForm.slug}
              />
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={productForm.featured} onChange={(e) => setProductForm((prev) => ({ ...prev, featured: e.target.checked }))} />
                  Featured
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={productForm.isNewArrival} onChange={(e) => setProductForm((prev) => ({ ...prev, isNewArrival: e.target.checked }))} />
                  New Arrivals
                </label>
              </div>

              {/* ── Product Information ───────────────────────────────── */}
              <fieldset className="border border-charcoal-200 p-4 space-y-3">
                <legend className="text-xs font-medium uppercase tracking-wider px-1 text-charcoal-500">Product Information</legend>

                <div>
                  <label className="block text-xs text-charcoal-500 mb-1">
                    Subtitle / context line
                    <span className="text-charcoal-400 font-normal"> — shown above the name (e.g. "Spring / Summer 2025")</span>
                  </label>
                  <input className="w-full border px-3 py-2 text-sm" placeholder="Spring / Summer 2025" value={productForm.info?.subtitle ?? ''} onChange={e => setInfo('subtitle', e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs text-charcoal-500 mb-1">
                    Material / composition
                    <span className="text-charcoal-400 font-normal"> — short line (e.g. "100% Mulberry Silk, Made in Italy")</span>
                  </label>
                  <input className="w-full border px-3 py-2 text-sm" placeholder="100% Mulberry Silk" value={productForm.info?.material ?? ''} onChange={e => setInfo('material', e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs text-charcoal-500 mb-1">
                    Product details
                    <span className="text-charcoal-400 font-normal"> — specification / construction text shown in expandable panel</span>
                  </label>
                  <textarea className="w-full border px-3 py-2 text-sm min-h-16" placeholder="Construction, care, and specification details..." value={productForm.info?.productDetails ?? ''} onChange={e => setInfo('productDetails', e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs text-charcoal-500 mb-1">
                    Collection note
                    <span className="text-charcoal-400 font-normal"> — editorial story text (campaign narrative, collection theme)</span>
                  </label>
                  <textarea className="w-full border px-3 py-2 text-sm min-h-16" placeholder="This piece is part of our SS25 archive collection..." value={productForm.info?.collectionNote ?? ''} onChange={e => setInfo('collectionNote', e.target.value)} />
                </div>

                <div className="border-t border-charcoal-100 pt-3">
                  <label className="block text-xs text-charcoal-500 mb-1">
                    Delivery info override
                    <span className="text-charcoal-400 font-normal"> — leave empty to use the site default set in Settings</span>
                  </label>
                  <textarea className="w-full border px-3 py-2 text-sm min-h-12" placeholder="(uses site default if empty)" value={productForm.info?.deliveryInfo ?? ''} onChange={e => setInfo('deliveryInfo', e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs text-charcoal-500 mb-1">
                    Returns & exchange override
                    <span className="text-charcoal-400 font-normal"> — leave empty to use the site default set in Settings</span>
                  </label>
                  <textarea className="w-full border px-3 py-2 text-sm min-h-12" placeholder="(uses site default if empty)" value={productForm.info?.returnsInfo ?? ''} onChange={e => setInfo('returnsInfo', e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs text-charcoal-500 mb-1">
                    Shipping info override
                    <span className="text-charcoal-400 font-normal"> — leave empty to use the site default set in Settings</span>
                  </label>
                  <textarea className="w-full border px-3 py-2 text-sm min-h-12" placeholder="(uses site default if empty)" value={productForm.info?.shippingInfo ?? ''} onChange={e => setInfo('shippingInfo', e.target.value)} />
                </div>

                <div className="border-t border-charcoal-100 pt-3">
                  <label className="block text-xs text-charcoal-500 mb-2">
                    Size guide
                  </label>
                  <select className="w-full border px-3 py-2 text-sm mb-2" value={productForm.info?.sizeGuideType ?? ''} onChange={e => setInfo('sizeGuideType', e.target.value)}>
                    <option value="">None — hide size guide</option>
                    <option value="text">Text — show as expandable panel</option>
                    <option value="url">Link — show as "View Size Guide" button</option>
                  </select>
                  {productForm.info?.sizeGuideType === 'text' && (
                    <textarea className="w-full border px-3 py-2 text-sm min-h-20" placeholder="Size guide content (e.g. XS = 32–34, S = 34–36...)" value={productForm.info?.sizeGuideContent ?? ''} onChange={e => setInfo('sizeGuideContent', e.target.value)} />
                  )}
                  {productForm.info?.sizeGuideType === 'url' && (
                    <input className="w-full border px-3 py-2 text-sm" placeholder="https://..." value={productForm.info?.sizeGuideUrl ?? ''} onChange={e => setInfo('sizeGuideUrl', e.target.value)} />
                  )}
                </div>
              </fieldset>

              {/* ── Featured Info Card ────────────────────────────────── */}
              <fieldset className="border border-charcoal-200 p-4 space-y-3">
                <legend className="text-xs font-medium uppercase tracking-wider px-1 text-charcoal-500">Featured Info Card (Optional)</legend>
                <p className="text-xs text-charcoal-400">An optional editorial block shown at the bottom of the product info panel. Only appears if a title is set.</p>

                <div>
                  <label className="block text-xs text-charcoal-500 mb-1">Card title <span className="text-charcoal-400 font-normal">(e.g. "Our Commitment to Craft")</span></label>
                  <input className="w-full border px-3 py-2 text-sm" placeholder="Our Commitment to Craft" value={productForm.info?.infoCardTitle ?? ''} onChange={e => setInfo('infoCardTitle', e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs text-charcoal-500 mb-1">Card body text</label>
                  <textarea className="w-full border px-3 py-2 text-sm min-h-16" placeholder="A short description for this editorial block..." value={productForm.info?.infoCardBody ?? ''} onChange={e => setInfo('infoCardBody', e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs text-charcoal-500 mb-1">
                    Card image
                    <span className="text-charcoal-400 font-normal"> — optional; use an image from the Media Library</span>
                  </label>
                  {productForm.info?.infoCardImage && (
                    <img src={productForm.info.infoCardImage} alt="Card preview" className="h-20 w-auto object-cover border mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm border border-charcoal-200 file:mr-4 file:py-1 file:px-3 file:border-0 file:bg-charcoal file:text-cream file:text-xs"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const { uploadImage } = await import('@/lib/adminApi')
                      const { url } = await uploadImage(file)
                      setInfo('infoCardImage', url)
                    }}
                  />
                  <input className="w-full border px-3 py-2 text-sm mt-1" placeholder="Or paste image URL" value={productForm.info?.infoCardImage ?? ''} onChange={e => setInfo('infoCardImage', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-charcoal-500 mb-1">CTA label <span className="text-charcoal-400 font-normal">(link text)</span></label>
                    <input className="w-full border px-3 py-2 text-sm" placeholder="Learn more" value={productForm.info?.infoCardCtaLabel ?? ''} onChange={e => setInfo('infoCardCtaLabel', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-charcoal-500 mb-1">CTA URL</label>
                    <input className="w-full border px-3 py-2 text-sm" placeholder="https://..." value={productForm.info?.infoCardCtaUrl ?? ''} onChange={e => setInfo('infoCardCtaUrl', e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <div className="flex gap-2">
                <button disabled={saving} className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em]">
                  {saving ? 'Saving...' : editingProductId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={resetProductForm} className="border border-charcoal px-4 py-2 text-xs uppercase tracking-[0.2em]">
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}

        {currentSection === 'Categories' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white border border-charcoal-100 p-4 space-y-4">
              <h3 className="font-serif text-2xl">Divisions ({divisions.length})</h3>
              {divisions.map((division) => (
                <div key={division.id} className="border border-charcoal-100 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{division.title}</p>
                    <p className="text-xs text-charcoal-400">{division.key}</p>
                    <p className="text-2xs text-charcoal-300 mt-1">
                      {division.visible ? '✓ Visible' : '✗ Hidden'}
                    </p>
                  </div>
                  <button
                    className="text-xs underline"
                    onClick={() => {
                      setDivisionForm(division)
                    }}
                  >
                    Edit
                  </button>
                </div>
              ))}
              <form
                className="space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSaving(true)
                  setError(null)
                  try {
                    // Ensure visible defaults to true for new divisions
                    const divisionData = {
                      ...divisionForm,
                      visible: divisionForm.visible !== undefined ? divisionForm.visible : true,
                    }
                    await saveDivision(divisionData)
                    setDivisionForm({})
                    await refresh()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to save division')
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                <h4 className="font-medium text-sm">
                  {divisionForm.id ? `Editing: ${divisionForm.title}` : 'Create New Division'}
                </h4>
                <input className="w-full border px-3 py-2" placeholder="Division key (e.g., men, women)" value={divisionForm.key ?? ''} onChange={(e) => setDivisionForm((prev: any) => ({ ...prev, key: e.target.value }))} required />
                <input className="w-full border px-3 py-2" placeholder="Title (e.g., Men's Collection)" value={divisionForm.title ?? ''} onChange={(e) => setDivisionForm((prev: any) => ({ ...prev, title: e.target.value }))} required />
                <textarea className="w-full border px-3 py-2" placeholder="Intro text" value={divisionForm.intro ?? ''} onChange={(e) => setDivisionForm((prev: any) => ({ ...prev, intro: e.target.value }))} required />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Division Hero Image</p>
                  {divisionForm.image && <img src={divisionForm.image} className="h-20 w-auto object-cover border" alt="Division preview" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm border border-charcoal-200 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-charcoal file:text-cream file:text-xs file:uppercase file:tracking-wider"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const { url } = await uploadImage(file)
                      setDivisionForm((prev: any) => ({ ...prev, image: url }))
                    }}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={divisionForm.visible !== undefined ? divisionForm.visible : true} onChange={(e) => setDivisionForm((prev: any) => ({ ...prev, visible: e.target.checked }))} />
                  Visible on website
                </label>
                <div className="flex gap-2">
                  <button disabled={saving} className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em]">
                    {saving ? 'Saving...' : divisionForm.id ? 'Update Division' : 'Create Division'}
                  </button>
                  {divisionForm.id && (
                    <button type="button" onClick={() => setDivisionForm({})} className="border border-charcoal px-4 py-2 text-xs uppercase tracking-[0.2em]">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
            <div className="bg-white border border-charcoal-100 p-4 space-y-4">
              <h3 className="font-serif text-2xl">Categories ({categories.length})</h3>
              {categories.map((category) => (
                <div key={category.id} className="border border-charcoal-100 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-charcoal-400">{category.slug}</p>
                    <p className="text-2xs text-charcoal-300 mt-1">
                      {category.visible ? '✓ Visible' : '✗ Hidden'} • Division: {category.division?.title ?? 'None'} • {(category as any)._count?.products ?? 0} products
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs underline" onClick={() => setCategoryForm(category)}>
                      Edit
                    </button>
                    <button
                      className="text-xs underline text-red-600"
                      onClick={async () => {
                        setCategoryToDelete(category)
                        setDeleteAction('unassign')
                        setReassignTargetId('')
                        try {
                          const countData = await getCategoryProductCount(category.id)
                          setCategoryProductCount(countData.productCount)
                        } catch {
                          setCategoryProductCount(0)
                        }
                        setDeleteModalOpen(true)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              <form
                className="space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSaving(true)
                  setError(null)
                  try {
                    // Ensure visible defaults to true for new categories
                    const categoryData = {
                      ...categoryForm,
                      visible: categoryForm.visible !== undefined ? categoryForm.visible : true,
                    }
                    await saveCategory(categoryData)
                    setCategoryForm({})
                    await refresh()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to save category')
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                <h4 className="font-medium text-sm">
                  {categoryForm.id ? `Editing: ${categoryForm.name}` : 'Create New Category'}
                </h4>
                <input className="w-full border px-3 py-2" placeholder="Category name" value={categoryForm.name ?? ''} onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, name: e.target.value }))} required />
                <input className="w-full border px-3 py-2" placeholder="Slug (e.g., summer-dresses)" value={categoryForm.slug ?? ''} onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, slug: e.target.value }))} required />
                <select className="w-full border px-3 py-2" value={categoryForm.divisionId ?? ''} onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, divisionId: e.target.value || null }))}>
                  <option value="">Select Division (Optional)</option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.title}
                    </option>
                  ))}
                </select>
                <textarea className="w-full border px-3 py-2" placeholder="Description" value={categoryForm.description ?? ''} onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, description: e.target.value }))} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={categoryForm.visible !== undefined ? categoryForm.visible : true} onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, visible: e.target.checked }))} />
                  Visible on website
                </label>
                <div className="flex gap-2">
                  <button disabled={saving} className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em]">
                    {saving ? 'Saving...' : categoryForm.id ? 'Update Category' : 'Create Category'}
                  </button>
                  {categoryForm.id && (
                    <button type="button" onClick={() => setCategoryForm({})} className="border border-charcoal px-4 py-2 text-xs uppercase tracking-[0.2em]">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {currentSection === 'Collections' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white border border-charcoal-100 p-4 space-y-3">
              {collections.map((collection) => (
                <div key={collection.id} className="border border-charcoal-100 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{collection.title}</p>
                    <p className="text-xs text-charcoal-400">{collection.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-xs underline"
                      onClick={() =>
                        setCollectionForm({
                          ...collection,
                          productIdsText: collection.products.map((entry) => entry.product.id).join(','),
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs underline text-red-600"
                      onClick={async () => {
                        await deleteCollection(collection.id)
                        await refresh()
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <form
              className="bg-white border border-charcoal-100 p-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault()
                const productIds = (collectionForm.productIdsText ?? '')
                  .split(',')
                  .map((id: string) => id.trim())
                  .filter(Boolean)
                // Ensure visible defaults to true for new collections
                const collectionData = {
                  ...collectionForm,
                  productIds,
                  visible: collectionForm.visible !== undefined ? collectionForm.visible : true,
                }
                await saveCollection(collectionData)
                setCollectionForm({ productIdsText: '' })
                await refresh()
              }}
            >
              <h3 className="font-serif text-2xl">Collection Form</h3>
              <input className="w-full border px-3 py-2" placeholder="Title" value={collectionForm.title ?? ''} onChange={(e) => setCollectionForm((prev: any) => ({ ...prev, title: e.target.value }))} />
              <input className="w-full border px-3 py-2" placeholder="Slug" value={collectionForm.slug ?? ''} onChange={(e) => setCollectionForm((prev: any) => ({ ...prev, slug: e.target.value }))} />
              <textarea className="w-full border px-3 py-2" placeholder="Intro" value={collectionForm.intro ?? ''} onChange={(e) => setCollectionForm((prev: any) => ({ ...prev, intro: e.target.value }))} />
              <input className="w-full border px-3 py-2" placeholder="Image URL" value={collectionForm.image ?? ''} onChange={(e) => setCollectionForm((prev: any) => ({ ...prev, image: e.target.value }))} />
              <textarea className="w-full border px-3 py-2 min-h-24" placeholder="Product IDs (comma separated)" value={collectionForm.productIdsText ?? ''} onChange={(e) => setCollectionForm((prev: any) => ({ ...prev, productIdsText: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={collectionForm.visible !== undefined ? collectionForm.visible : true} onChange={(e) => setCollectionForm((prev: any) => ({ ...prev, visible: e.target.checked }))} />
                Visible on website
              </label>
              <button className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em]">Save Collection</button>
            </form>
          </div>
        )}

        {currentSection === 'Homepage' && homepage && (
          <div className="space-y-6">
            <form
              className="bg-white border border-charcoal-100 p-4 grid lg:grid-cols-2 gap-3"
              onSubmit={async (e) => {
                e.preventDefault()
                await updateHomepageContent(homepage)
                await refresh()
              }}
            >
              <input className="border px-3 py-2" value={homepage.heroHeading ?? ''} onChange={(e) => setHomepage((prev: any) => ({ ...prev, heroHeading: e.target.value }))} placeholder="Hero heading" />
              <input className="border px-3 py-2" value={homepage.heroSubtext ?? ''} onChange={(e) => setHomepage((prev: any) => ({ ...prev, heroSubtext: e.target.value }))} placeholder="Hero subtext" />
              <input className="border px-3 py-2" value={homepage.heroButtonText ?? ''} onChange={(e) => setHomepage((prev: any) => ({ ...prev, heroButtonText: e.target.value }))} placeholder="Hero button text" />
              <input className="border px-3 py-2" value={homepage.heroButtonLink ?? ''} onChange={(e) => setHomepage((prev: any) => ({ ...prev, heroButtonLink: e.target.value }))} placeholder="Hero button link" />
              <div className="lg:col-span-2 space-y-2">
                <p className="text-sm font-medium">Landing Page Hero Image</p>
                {homepage.heroImage && <img src={homepage.heroImage} className="h-28 w-auto object-cover border" alt="Hero preview" />}
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm border border-charcoal-200 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-charcoal file:text-cream file:text-xs file:uppercase file:tracking-wider"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const { url } = await uploadImage(file)
                    setHomepage((prev: any) => ({ ...prev, heroImage: url }))
                  }}
                />
              </div>
              <input className="border px-3 py-2" value={homepage.newsletterLabel ?? ''} onChange={(e) => setHomepage((prev: any) => ({ ...prev, newsletterLabel: e.target.value }))} placeholder="Newsletter label" />
              <input className="border px-3 py-2" value={homepage.newsletterHeading ?? ''} onChange={(e) => setHomepage((prev: any) => ({ ...prev, newsletterHeading: e.target.value }))} placeholder="Newsletter heading" />
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={homepage.showFeatured} onChange={(e) => setHomepage((prev: any) => ({ ...prev, showFeatured: e.target.checked }))} />
                Show featured sections
              </label>
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={homepage.showNewsletter} onChange={(e) => setHomepage((prev: any) => ({ ...prev, showNewsletter: e.target.checked }))} />
                Show newsletter section
              </label>
              <button className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em] w-fit">Save Homepage Content</button>
            </form>

            <div className="bg-white border border-charcoal-100 p-4 space-y-3">
              <h3 className="font-serif text-2xl">Homepage Sections</h3>
              {homepage.sections.map((section: any) => (
                <div key={section.id} className="border border-charcoal-100 p-3">
                  <p className="font-medium">{section.title}</p>
                  <p className="text-xs text-charcoal-400 mb-2">{section.key}</p>
                  <button
                    className="text-xs underline text-red-600"
                    onClick={async () => {
                      await deleteHomepageSection(section.id)
                      await refresh()
                    }}
                  >
                    Delete section
                  </button>
                </div>
              ))}
              <form
                className="grid lg:grid-cols-2 gap-2 pt-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  await saveHomepageSection({
                    key: String(formData.get('key') || ''),
                    title: String(formData.get('title') || ''),
                    label: String(formData.get('label') || ''),
                    subtitle: String(formData.get('subtitle') || ''),
                    ctaLabel: String(formData.get('ctaLabel') || ''),
                    ctaLink: String(formData.get('ctaLink') || ''),
                    visible: formData.get('visible') === 'on',
                    sortOrder: Number(formData.get('sortOrder') || 0),
                    productIds: String(formData.get('productIds') || '')
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                  ;(e.currentTarget as HTMLFormElement).reset()
                  await refresh()
                }}
              >
                <input name="key" className="border px-3 py-2" placeholder="Section key" />
                <input name="label" className="border px-3 py-2" placeholder="Label" />
                <input name="title" className="border px-3 py-2" placeholder="Title" />
                <input name="subtitle" className="border px-3 py-2" placeholder="Subtitle" />
                <input name="ctaLabel" className="border px-3 py-2" placeholder="CTA label" />
                <input name="ctaLink" className="border px-3 py-2" placeholder="CTA link" />
                <input name="sortOrder" type="number" className="border px-3 py-2" placeholder="Sort order" />
                <input name="productIds" className="border px-3 py-2" placeholder="Product IDs (comma separated)" />
                <label className="text-sm flex items-center gap-2">
                  <input name="visible" type="checkbox" defaultChecked />
                  Visible
                </label>
                <button className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em] w-fit">Add / Update Section</button>
              </form>
            </div>
          </div>
        )}

        {currentSection === 'Navigation' && (
          <div className="bg-white border border-charcoal-100 p-4 space-y-3">
            {navigationItems.map((item, index) => (
              <div key={item.id ?? `${item.location}-${index}`} className="grid lg:grid-cols-6 gap-2 border border-charcoal-100 p-2">
                <input className="border px-2 py-1" value={item.label} onChange={(e) => setNavigationItems((prev) => prev.map((entry, i) => (i === index ? { ...entry, label: e.target.value } : entry)))} />
                <input className="border px-2 py-1" value={item.path} onChange={(e) => setNavigationItems((prev) => prev.map((entry, i) => (i === index ? { ...entry, path: e.target.value } : entry)))} />
                <input className="border px-2 py-1" value={item.location} onChange={(e) => setNavigationItems((prev) => prev.map((entry, i) => (i === index ? { ...entry, location: e.target.value } : entry)))} />
                <input
                  type="number"
                  className="border px-2 py-1"
                  value={item.sortOrder}
                  onChange={(e) => setNavigationItems((prev) => prev.map((entry, i) => (i === index ? { ...entry, sortOrder: Number(e.target.value || 0) } : entry)))}
                />
                <label className="text-xs flex items-center gap-2">
                  <input type="checkbox" checked={item.visible} onChange={(e) => setNavigationItems((prev) => prev.map((entry, i) => (i === index ? { ...entry, visible: e.target.checked } : entry)))} />
                  Visible
                </label>
                <button className="text-xs underline text-red-600" onClick={() => setNavigationItems((prev) => prev.filter((_, i) => i !== index))}>
                  Remove
                </button>
              </div>
            ))}
            <button
              className="border border-charcoal px-3 py-2 text-xs uppercase tracking-[0.2em]"
              onClick={() =>
                setNavigationItems((prev) => [...prev, { label: 'New Link', path: '/', location: 'HEADER', visible: true, sortOrder: prev.length + 1, openInNewTab: false }])
              }
            >
              Add Menu Item
            </button>
            <button onClick={saveNavigation} className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em] ml-2">
              Save Navigation
            </button>
          </div>
        )}

        {currentSection === 'Orders' && (
          <div className="bg-white border border-charcoal-100 p-4 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-charcoal-100">
                  <th className="py-2">Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-charcoal-100">
                    <td className="py-3">{order.orderNumber}</td>
                    <td>{order.customerName}</td>
                    <td>{order.total.toLocaleString()}</td>
                    <td>
                      <select
                        className="border px-2 py-1"
                        value={order.status}
                        onChange={async (e) => {
                          const status = e.target.value as AdminOrder['status']
                          await updateAdminOrderStatus(order.id, status)
                          setOrders((prev) => prev.map((entry) => (entry.id === order.id ? { ...entry, status } : entry)))
                        }}
                      >
                        {['PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentSection === 'Customers' && (
          <div className="bg-white border border-charcoal-100 p-4 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-charcoal-100">
                  <th className="py-2">Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-charcoal-100">
                    <td className="py-3">{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.email ?? '-'}</td>
                    <td>{customer._count.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentSection === 'Media Library' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white border border-charcoal-100 p-4 space-y-3">
              {media.map((asset) => (
                <div key={asset.id} className="border border-charcoal-100 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{asset.title || 'Untitled asset'}</p>
                    <a href={asset.url} target="_blank" className="text-xs text-charcoal-400 underline" rel="noreferrer">
                      {asset.url}
                    </a>
                  </div>
                  <button
                    className="text-xs underline text-red-600"
                    onClick={async () => {
                      await deleteMediaAsset(asset.id)
                      await refresh()
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <form
              className="bg-white border border-charcoal-100 p-4 space-y-2"
              onSubmit={async (e) => {
                e.preventDefault()
                await createMediaAsset(mediaForm)
                setMediaForm({ title: '', alt: '', url: '' })
                await refresh()
              }}
            >
              <h3 className="font-serif text-2xl">Add Media</h3>
              <input className="w-full border px-3 py-2" placeholder="Title" value={mediaForm.title} onChange={(e) => setMediaForm((prev) => ({ ...prev, title: e.target.value }))} />
              <input className="w-full border px-3 py-2" placeholder="Alt text" value={mediaForm.alt} onChange={(e) => setMediaForm((prev) => ({ ...prev, alt: e.target.value }))} />
              <input className="w-full border px-3 py-2" placeholder="Image URL" value={mediaForm.url} onChange={(e) => setMediaForm((prev) => ({ ...prev, url: e.target.value }))} />
              <button className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em]">Save Asset</button>
            </form>
          </div>
        )}

        {currentSection === 'Newsletter' && (
          <div className="space-y-6">
            {/* Newsletter Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-charcoal-100 p-4">
                <div className="text-2xl font-bold">{newsletterStats.total}</div>
                <div className="text-sm text-gray-600">Total Subscribers</div>
              </div>
              <div className="bg-white border border-charcoal-100 p-4">
                <div className="text-2xl font-bold text-green-600">{newsletterStats.active}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="bg-white border border-charcoal-100 p-4">
                <div className="text-2xl font-bold text-gray-400">{newsletterStats.unsubscribed}</div>
                <div className="text-sm text-gray-600">Unsubscribed</div>
              </div>
            </div>

            {/* Send Newsletter Form */}
            <form
              className="bg-white border border-charcoal-100 p-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (sendingNewsletter) return
                
                if (!newsletterForm.subject || !newsletterForm.heading || !newsletterForm.body) {
                  alert('Subject, heading, and body are required')
                  return
                }

                if ((newsletterForm.ctaLabel && !newsletterForm.ctaLink) || (!newsletterForm.ctaLabel && newsletterForm.ctaLink)) {
                  alert('CTA label and link must both be provided or both be empty')
                  return
                }

                if (!confirm(`Send newsletter to ${newsletterStats.active} active subscribers?`)) {
                  return
                }

                setSendingNewsletter(true)
                setNewsletterResult(null)
                try {
                  const result = await sendNewsletter({
                    subject: newsletterForm.subject,
                    heading: newsletterForm.heading,
                    body: newsletterForm.body,
                    ctaLabel: newsletterForm.ctaLabel || undefined,
                    ctaLink: newsletterForm.ctaLink || undefined,
                  })
                  setNewsletterResult(
                    `Newsletter sent! ${result.successCount} succeeded, ${result.failureCount} failed out of ${result.totalSubscribers} active subscribers.`
                  )
                  setNewsletterForm({
                    subject: '',
                    heading: '',
                    body: '',
                    ctaLabel: '',
                    ctaLink: '',
                  })
                } catch (err: any) {
                  setNewsletterResult(`Failed to send newsletter: ${err.message}`)
                } finally {
                  setSendingNewsletter(false)
                }
              }}
            >
              <h3 className="font-serif text-2xl">Send Newsletter</h3>
              
              {newsletterResult && (
                <div className={`p-3 rounded ${newsletterResult.includes('Failed') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                  {newsletterResult}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Subject Line *</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2"
                  placeholder="e.g., New Drop: Spring Collection 2026"
                  value={newsletterForm.subject}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, subject: e.target.value })}
                  maxLength={200}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Heading *</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2"
                  placeholder="e.g., Introducing Our Spring Line"
                  value={newsletterForm.heading}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, heading: e.target.value })}
                  maxLength={200}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Body Text *</label>
                <textarea
                  className="w-full border px-3 py-2"
                  rows={6}
                  placeholder="Write your announcement here. Use line breaks for paragraphs."
                  value={newsletterForm.body}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, body: e.target.value })}
                  maxLength={5000}
                  required
                />
                <div className="text-xs text-gray-500 mt-1">{newsletterForm.body.length} / 5000 characters</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CTA Button Label (optional)</label>
                  <input
                    type="text"
                    className="w-full border px-3 py-2"
                    placeholder="e.g., Shop Now"
                    value={newsletterForm.ctaLabel}
                    onChange={(e) => setNewsletterForm({ ...newsletterForm, ctaLabel: e.target.value })}
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CTA Link (optional)</label>
                  <input
                    type="url"
                    className="w-full border px-3 py-2"
                    placeholder="https://akwaluzto.com/collections/spring"
                    value={newsletterForm.ctaLink}
                    onChange={(e) => setNewsletterForm({ ...newsletterForm, ctaLink: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={sendingNewsletter}
                  className="bg-charcoal text-cream px-6 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                >
                  {sendingNewsletter ? 'Sending...' : `Send to ${newsletterStats.active} Subscribers`}
                </button>
                <button
                  type="button"
                  className="border border-charcoal px-6 py-2 text-xs uppercase tracking-[0.2em]"
                  onClick={() => {
                    setNewsletterForm({
                      subject: '',
                      heading: '',
                      body: '',
                      ctaLabel: '',
                      ctaLink: '',
                    })
                    setNewsletterResult(null)
                  }}
                >
                  Clear
                </button>
              </div>
            </form>

            {/* Recent Subscribers */}
            <div className="bg-white border border-charcoal-100 p-6">
              <h3 className="font-serif text-2xl mb-4">Recent Subscribers</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Source</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Subscribed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.slice(0, 50).map((sub) => (
                      <tr key={sub.id} className="border-b">
                        <td className="py-2">{sub.email}</td>
                        <td className="py-2 text-gray-600">{sub.source || 'website'}</td>
                        <td className="py-2">
                          {sub.active ? (
                            <span className="text-green-600 font-medium">Active</span>
                          ) : (
                            <span className="text-gray-400">Unsubscribed</span>
                          )}
                        </td>
                        <td className="py-2 text-gray-600">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {subscribers.length > 50 && (
                  <div className="text-sm text-gray-500 mt-4 text-center">
                    Showing 50 of {subscribers.length} subscribers
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentSection === 'Settings' && settings && (
          <div className="grid lg:grid-cols-2 gap-6">
            <form
              className="bg-white border border-charcoal-100 p-4 grid gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                await updateSiteSettings(settings)
                await refresh()
              }}
            >
              <h3 className="font-serif text-2xl">Site Settings</h3>
              <input className="border px-3 py-2" placeholder="Newsletter label" value={settings.newsletterLabel ?? ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, newsletterLabel: e.target.value } : prev))} />
              <input className="border px-3 py-2" placeholder="Newsletter heading" value={settings.newsletterHeading ?? ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, newsletterHeading: e.target.value } : prev))} />
              <textarea className="border px-3 py-2" placeholder="Newsletter text" value={settings.newsletterText ?? ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, newsletterText: e.target.value } : prev))} />
              <input className="border px-3 py-2" placeholder="Contact email" value={settings.contactEmail ?? ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, contactEmail: e.target.value } : prev))} />
              <input className="border px-3 py-2" placeholder="Contact phone" value={settings.contactPhone ?? ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, contactPhone: e.target.value } : prev))} />
              <input className="border px-3 py-2" placeholder="Instagram URL" value={settings.instagramUrl ?? ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, instagramUrl: e.target.value } : prev))} />

              <p className="text-xs font-medium uppercase tracking-wider text-charcoal-500 border-t border-charcoal-100 pt-3 mt-1">
                Store Policy Defaults
                <span className="block text-charcoal-400 font-normal normal-case tracking-normal mt-0.5">
                  Shown on every product page unless the product has its own override.
                  Leave empty to hide those rows when no product override is set.
                </span>
              </p>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1">Default delivery info</label>
                <textarea className="border px-3 py-2 w-full min-h-12 text-sm" placeholder="e.g. Delivery across Lebanon in 2–4 business days · Cash on delivery" value={settings.defaultDeliveryInfo ?? ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, defaultDeliveryInfo: e.target.value || null } : prev))} />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1">Default returns & exchange info</label>
                <textarea className="border px-3 py-2 w-full min-h-12 text-sm" placeholder="e.g. Exchange within 7 days of receipt in original condition" value={settings.defaultReturnsInfo ?? ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, defaultReturnsInfo: e.target.value || null } : prev))} />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1">Default shipping info</label>
                <textarea className="border px-3 py-2 w-full min-h-12 text-sm" placeholder="e.g. Free shipping on orders over $200" value={settings.defaultShippingInfo ?? ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, defaultShippingInfo: e.target.value || null } : prev))} />
              </div>

              <button className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em] w-fit">Save Settings</button>
            </form>
            <div className="bg-white border border-charcoal-100 p-4 space-y-3">
              <h3 className="font-serif text-2xl">Admin Users</h3>
              {admins.map((user) => (
                <div key={user.id} className="border border-charcoal-100 p-3">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-charcoal-400">
                    {user.email} · {user.role}
                  </p>
                </div>
              ))}
              <form
                className="grid gap-2 pt-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  await saveAdminUser(adminForm as any)
                  setAdminForm({ email: '', name: '', role: 'EDITOR', password: '' })
                  await refresh()
                }}
              >
                <input className="border px-3 py-2" placeholder="Admin name" value={adminForm.name} onChange={(e) => setAdminForm((prev) => ({ ...prev, name: e.target.value }))} />
                <input className="border px-3 py-2" placeholder="Admin email" value={adminForm.email} onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))} />
                <select className="border px-3 py-2" value={adminForm.role} onChange={(e) => setAdminForm((prev) => ({ ...prev, role: e.target.value }))}>
                  <option value="EDITOR">EDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <input type="password" className="border px-3 py-2" placeholder="Password" value={adminForm.password} onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))} />
                <button className="bg-charcoal text-cream px-4 py-2 text-xs uppercase tracking-[0.2em] w-fit">Create Admin</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Category Delete Modal */}
      {deleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full p-6 shadow-2xl border border-charcoal-200">
            <h3 className="font-serif text-2xl mb-4">Delete Category</h3>

            <p className="text-charcoal-600 mb-4">
              You are about to delete category:
              <strong className="text-charcoal block mt-1">{categoryToDelete.name}</strong>
            </p>

            {categoryProductCount > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 mb-4">
                <p className="text-yellow-800 text-sm">
                  ⚠️ This category has <strong>{categoryProductCount}</strong> product(s) assigned to it.
                  You must choose what to do with these products before deleting.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 p-4 mb-4">
                <p className="text-green-800 text-sm">✓ No products are using this category. Safe to delete.</p>
              </div>
            )}

            {categoryProductCount > 0 && (
              <div className="space-y-3 mb-4">
                <label className="block text-sm font-medium text-charcoal-700">Choose action for products:</label>

                <div className="space-y-2">
                  <label className="flex items-start gap-2 p-3 border border-charcoal-200 cursor-pointer hover:bg-cream-50">
                    <input
                      type="radio"
                      name="deleteAction"
                      value="unassign"
                      checked={deleteAction === 'unassign'}
                      onChange={() => {
                        setDeleteAction('unassign')
                        setReassignTargetId('')
                      }}
                    />
                    <span className="text-sm">
                      <strong>Remove category from products</strong>
                      <span className="text-charcoal-500 block">Products will have no category assigned</span>
                    </span>
                  </label>

                  <label className="flex items-start gap-2 p-3 border border-charcoal-200 cursor-pointer hover:bg-cream-50">
                    <input
                      type="radio"
                      name="deleteAction"
                      value="reassign"
                      checked={deleteAction === 'reassign'}
                      onChange={() => setDeleteAction('reassign')}
                    />
                    <span className="text-sm">
                      <strong>Move products to another category</strong>
                      <span className="text-charcoal-500 block">Select a target category below</span>
                    </span>
                  </label>
                </div>

                {deleteAction === 'reassign' && (
                  <select
                    className="w-full border border-charcoal-300 px-3 py-2 text-sm"
                    value={reassignTargetId}
                    onChange={(e) => setReassignTargetId(e.target.value)}
                    required={deleteAction === 'reassign'}
                  >
                    <option value="">Select target category...</option>
                    {categories
                      .filter((c) => c.id !== categoryToDelete.id && c.visible)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.division?.title && `(${c.division.title})`}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            )}

            <p className="text-xs text-charcoal-400 mb-6">
              This action cannot be undone. The category will be permanently removed from the database
              and will no longer appear anywhere on the storefront.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 border border-charcoal text-sm"
                onClick={() => {
                  setDeleteModalOpen(false)
                  setCategoryToDelete(null)
                  setCategoryProductCount(0)
                  setReassignTargetId('')
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white text-sm disabled:opacity-50"
                disabled={categoryProductCount > 0 && deleteAction === 'reassign' && !reassignTargetId}
                onClick={async () => {
                  if (!categoryToDelete) return
                  setSaving(true)
                  try {
                    const action = categoryProductCount > 0 ? deleteAction : undefined
                    const targetCategoryId = deleteAction === 'reassign' ? reassignTargetId : undefined
                    await deleteCategory(categoryToDelete.id, action, targetCategoryId)
                    setDeleteModalOpen(false)
                    setCategoryToDelete(null)
                    setCategoryProductCount(0)
                    setReassignTargetId('')
                    await refresh()
                  } catch (err: any) {
                    setError(err.message || 'Failed to delete category')
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                {saving ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
