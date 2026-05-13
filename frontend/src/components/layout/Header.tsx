import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CircleUserRound, Menu, Search, ShoppingBag, X, Heart, Package, MapPin, LogOut, Sparkles, ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { getStorefrontConfig, type NavigationItem, type Division } from '@/lib/storefront'
import { resendVerification } from '@/lib/api'

const DEFAULT_NAV = [
  { to: '/men', label: 'Men' },
  { to: '/women', label: 'Women' },
  { to: '/accessories', label: 'Accessories' },
  { to: '/new-arrivals', label: 'New Arrivals' },
]

type MegaLink = { label: string; to: string; description?: string }
type MegaSub = { id: string; label: string; to: string; links: MegaLink[] }
type MegaTop = { id: string; label: string; to: string; image: string; caption: string; subs: MegaSub[]; highlights: MegaLink[] }

const DEFAULT_TOP_ORDER = [
  { id: 'new-arrivals', label: 'New Arrivals', fallbackPath: '/new-arrivals' },
  { id: 'women', label: 'Women', fallbackPath: '/women' },
  { id: 'men', label: 'Men', fallbackPath: '/men' },
  { id: 'accessories', label: 'Accessories', fallbackPath: '/accessories' },
  { id: 'gifts', label: 'Gifts', fallbackPath: '/collections' },
  { id: 'about', label: 'About', fallbackPath: '/about' },
]

const CATEGORY_IMAGE_MAP: Record<string, { image: string; caption: string }> = {
  'new-arrivals': { image: '/images/new-arrivals.jpeg', caption: 'Seasonal Edit' },
  women: { image: '/images/women-division.jpeg', caption: 'Womenswear Campaign' },
  men: { image: '/images/men-division.jpeg', caption: 'Menswear Campaign' },
  accessories: { image: '/images/accessories-division.jpeg', caption: 'Leather & Jewellery' },
  gifts: { image: '/images/category-5.jpeg', caption: 'Gift Selection' },
  about: { image: '/images/about.jpeg', caption: 'Maison Story' },
}

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function byLabel(navItems: Array<{ to: string; label: string }>, label: string) {
  return navItems.find((item) => item.label.trim().toLowerCase() === label.trim().toLowerCase())
}

function buildMegaMenu(navItems: Array<{ to: string; label: string }>, divisions: Division[] = []): MegaTop[] {
  const topEntries = DEFAULT_TOP_ORDER.map((item) => {
    const navMatch = byLabel(navItems, item.label)
    return {
      id: item.id,
      label: item.label,
      to: navMatch?.to || item.fallbackPath,
    }
  })

  return topEntries.map((top): MegaTop => {
    // Use actual categories from division data if available
    const division = divisions.find(d => d.key === top.id)

    if ((top.id === 'women' || top.id === 'men') && division?.categories?.length) {
      const base = top.id === 'women' ? '/women' : '/men'
      // Only show visible categories, sorted by sortOrder
      const visibleCategories = division.categories
        .filter((cat) => cat.visible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const subs = visibleCategories.map((cat) => {
        return {
          id: `${top.id}-${cat.slug}`,
          label: cat.name,
          to: `${base}/${cat.slug}`,
          links: [
            { label: `View All ${top.label}`, to: base, description: 'Full collection' },
            { label: `${cat.name} Edit`, to: `${base}/${cat.slug}`, description: 'Curated pieces' },
            { label: 'New Arrivals', to: '/new-arrivals', description: 'Latest release' },
            { label: 'Campaign Stories', to: '/drops', description: 'Editorial features' },
          ],
        }
      })
      return {
        ...top,
        image: CATEGORY_IMAGE_MAP[top.id]?.image || '/images/category-1.jpeg',
        caption: CATEGORY_IMAGE_MAP[top.id]?.caption || top.label,
        subs,
        highlights: [
          { label: 'Spring Summer Edit', to: '/new-arrivals' },
          { label: 'Private Styling Picks', to: '/recommendations' },
          { label: 'Campaign Stories', to: '/drops' },
        ],
      }
    }

    if (top.id === 'accessories' && division?.categories?.length) {
      // Only show visible categories, sorted by sortOrder
      const visibleCategories = division.categories
        .filter((cat) => cat.visible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const subs = visibleCategories.map((cat) => {
        return {
          id: `${top.id}-${cat.slug}`,
          label: cat.name,
          to: `/accessories/${cat.slug}`,
          links: [
            { label: 'View All Accessories', to: '/accessories', description: 'Complete edit' },
            { label: cat.name, to: `/accessories/${cat.slug}`, description: 'Focused selection' },
            { label: 'Gift Ideas', to: '/collections', description: 'Curated gifting' },
            { label: 'New Arrivals', to: '/new-arrivals', description: 'Latest pieces' },
          ],
        }
      })
      return {
        ...top,
        image: CATEGORY_IMAGE_MAP[top.id]?.image || '/images/category-1.jpeg',
        caption: CATEGORY_IMAGE_MAP[top.id]?.caption || top.label,
        subs,
        highlights: [
          { label: 'Leather Icons', to: '/accessories' },
          { label: 'Gift Selection', to: '/collections' },
          { label: 'New Accessories', to: '/new-arrivals' },
        ],
      }
    }

    // Fallback for women/men/accessories when no visible categories exist
    if ((top.id === 'women' || top.id === 'men' || top.id === 'accessories') &&
        (!division?.categories?.length || !division.categories.some(c => c.visible))) {
      // Only show division if it's visible
      if (division?.visible === false) {
        // Division is hidden, don't show in menu
        return {
          ...top,
          image: CATEGORY_IMAGE_MAP[top.id]?.image || '/images/category-1.jpeg',
          caption: CATEGORY_IMAGE_MAP[top.id]?.caption || top.label,
          subs: [],
          highlights: [],
        }
      }
      return {
        ...top,
        image: CATEGORY_IMAGE_MAP[top.id]?.image || '/images/category-1.jpeg',
        caption: CATEGORY_IMAGE_MAP[top.id]?.caption || top.label,
        subs: [],
        highlights: [
          { label: 'View Collection', to: top.to },
          { label: 'New Arrivals', to: '/new-arrivals' },
          { label: 'Campaign Stories', to: '/drops' },
        ],
      }
    }

    if (top.id === 'new-arrivals') {
      return {
        ...top,
        image: CATEGORY_IMAGE_MAP[top.id].image,
        caption: CATEGORY_IMAGE_MAP[top.id].caption,
        subs: [
          {
            id: 'new-arrivals-latest',
            label: 'Latest Drop',
            to: '/new-arrivals',
            links: [
              { label: 'View All New Arrivals', to: '/new-arrivals', description: 'Recently added pieces' },
              { label: 'For Women', to: '/women', description: 'Newest womenswear' },
              { label: 'For Men', to: '/men', description: 'Newest menswear' },
              { label: 'Accessories', to: '/accessories', description: 'New finishing touches' },
            ],
          },
        ],
        highlights: [
          { label: 'Seasonal Highlights', to: '/new-arrivals' },
          { label: 'Women New In', to: '/women' },
          { label: 'Men New In', to: '/men' },
        ],
      }
    }

    if (top.id === 'gifts') {
      return {
        ...top,
        image: CATEGORY_IMAGE_MAP[top.id].image,
        caption: CATEGORY_IMAGE_MAP[top.id].caption,
        subs: [
          {
            id: 'gifts-curated',
            label: 'Curated Gifts',
            to: '/collections',
            links: [
              { label: 'View Gift Selection', to: '/collections', description: 'Elevated gift picks' },
              { label: 'Accessories Gifts', to: '/accessories', description: 'Refined finishing touches' },
              { label: 'New Arrivals Gifts', to: '/new-arrivals', description: 'Recent highlights' },
              { label: 'Client Services', to: '/contact', description: 'Personal assistance' },
            ],
          },
        ],
        highlights: [
          { label: 'Gift Concierge', to: '/contact' },
          { label: 'For Her', to: '/women' },
          { label: 'For Him', to: '/men' },
        ],
      }
    }

    return {
      ...top,
      image: CATEGORY_IMAGE_MAP[top.id].image,
      caption: CATEGORY_IMAGE_MAP[top.id].caption,
      subs: [
        {
          id: 'about-maison',
          label: 'Maison',
          to: '/about',
          links: [
            { label: 'About Akwaluzto', to: '/about', description: 'Brand story' },
            { label: 'Contact Us', to: '/contact', description: 'Client services' },
            { label: 'Shipping & Returns', to: '/shipping', description: 'Order assistance' },
            { label: 'FAQ', to: '/faq', description: 'Quick answers' },
          ],
        },
      ],
      highlights: [
        { label: 'Maison Story', to: '/about' },
        { label: 'Client Services', to: '/contact' },
        { label: 'Shipping & Returns', to: '/shipping' },
      ],
    }
  })
}

export function Header() {
  const { items, toggleCart } = useCart()
  const { user, isAuthenticated, login, register, logout } = useAuth()
  const [activePanel, setActivePanel] = useState<'menu' | 'account' | 'contact' | 'search' | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const count = items.reduce((s, i) => s + i.quantity, 0)
  const [navItems, setNavItems] = useState(DEFAULT_NAV)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [selectedTopId, setSelectedTopId] = useState<string | null>(null)
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    getStorefrontConfig()
      .then((config) => {
        const headerItems = config.navigation
          .filter((item: NavigationItem) => item.location === 'HEADER' && item.visible)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => ({ to: item.path, label: item.label }))
        if (headerItems.length) setNavItems(headerItems)
        if (config.divisions?.length) setDivisions(config.divisions)
      })
      .catch(() => {
        setNavItems(DEFAULT_NAV)
        setDivisions([])
      })
  }, [])

  const isTransparent = isHome && scrollY < 90

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    setPendingVerificationEmail('')
    setResendStatus('idle')
    setAuthLoading(true)

    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const password = fd.get('password') as string

    try {
      if (authMode === 'signin') {
        await login(email, password)
      } else {
        const firstName = fd.get('firstName') as string
        const lastName = fd.get('lastName') as string
        await register(email, password, firstName, lastName)
      }
      setActivePanel(null)
    } catch (err: any) {
      const msg: string = err?.message || 'Authentication failed'
      setAuthError(msg)
      if (msg.toLowerCase().includes('verify your email')) {
        setPendingVerificationEmail(email)
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleNav = (path: string) => {
    setActivePanel(null)
    navigate(path)
  }

  const megaMenu = useMemo(() => buildMegaMenu(navItems, divisions), [navItems, divisions])
  const selectedTop = selectedTopId ? megaMenu.find((item) => item.id === selectedTopId) ?? null : null
  const selectedSub = selectedTop && selectedSubId ? selectedTop.subs.find((item) => item.id === selectedSubId) ?? null : null

  useEffect(() => {
    if (activePanel === 'menu') {
      setSelectedTopId(null)
      setSelectedSubId(null)
    }
  }, [activePanel])

  useEffect(() => {
    if (activePanel !== 'menu' || megaMenu.length === 0) return
    if (selectedTopId && !megaMenu.some((item) => item.id === selectedTopId)) {
      setSelectedTopId(null)
      setSelectedSubId(null)
      return
    }
    if (selectedTopId) {
      const currentTop = megaMenu.find((item) => item.id === selectedTopId)
      if (!currentTop) return
      if (selectedSubId && !currentTop.subs.some((item) => item.id === selectedSubId)) {
        setSelectedSubId(null)
      }
    }
  }, [activePanel, megaMenu, selectedTopId, selectedSubId])

  const selectTop = (topId: string) => {
    setSelectedTopId(topId)
    setSelectedSubId(null)
  }

  const isLeftPanel = activePanel === 'contact'
  const isRightPanel = activePanel === 'account' || activePanel === 'search'
  const showBackdrop = activePanel && activePanel !== 'menu'

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b',
          isTransparent ? 'bg-transparent border-transparent' : 'luxury-surface border-charcoal-100',
        )}
      >
        <div className="max-w-8xl mx-auto px-6 lg:px-12">
          <div className="flex items-center h-18 lg:h-22">
            <div className="flex items-center flex-1 min-w-0">
              <button onClick={() => setActivePanel('contact')} className={cn('luxury-link font-sans transition-colors duration-300', isTransparent ? 'text-cream/85 hover:text-cream' : 'text-charcoal hover:text-taupe-dark')}>
                Contact Us
              </button>
            </div>

            <Link to="/" className={cn('font-serif text-xl xl:text-2xl tracking-[0.2em] uppercase text-center shrink-0 transition-colors', isTransparent ? 'text-cream' : 'text-charcoal')}>
              Akwaluzto
            </Link>

            <div className="flex items-center justify-end gap-3 lg:gap-4 flex-1 min-w-0">
              <button onClick={() => setActivePanel('search')} className={cn('p-2 transition-colors', isTransparent ? 'text-cream hover:text-cream/70' : 'text-charcoal hover:text-taupe-dark')} aria-label="Search">
                <Search size={18} strokeWidth={1.5} />
              </button>
              <button onClick={() => { setAuthMode('signin'); setAuthError(''); setActivePanel('account') }} className={cn('p-2 transition-colors', isTransparent ? 'text-cream hover:text-cream/70' : 'text-charcoal hover:text-taupe-dark')} aria-label="Sign in">
                <CircleUserRound size={18} strokeWidth={1.5} />
              </button>
              <button onClick={toggleCart} className={cn('relative p-2 -mr-2 transition-colors shrink-0', isTransparent ? 'text-cream hover:text-cream/70' : 'text-charcoal hover:text-taupe-dark')} aria-label={`Cart (${count})`}>
                <ShoppingBag size={20} strokeWidth={1.5} />
                {count > 0 && <span className={cn('absolute -top-0.5 -right-0.5 w-4 h-4 text-[0.5rem] leading-none flex items-center justify-center rounded-full font-sans', isTransparent ? 'bg-cream text-charcoal' : 'bg-charcoal text-cream')}>{count > 9 ? '9+' : count}</span>}
              </button>
              <button onClick={() => setActivePanel('menu')} className={cn('p-2 transition-colors', isTransparent ? 'text-cream hover:text-cream/70' : 'text-charcoal hover:text-taupe-dark')}>
                <Menu size={20} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      <div className={cn('fixed inset-0 z-[70] transition-all duration-400 bg-black/55 backdrop-blur-sm', showBackdrop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} onClick={() => setActivePanel(null)} />

      {/* MEGA MENU — backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[75] bg-black/40 transition-opacity duration-400',
          activePanel === 'menu' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setActivePanel(null)}
      />

      {/* MEGA MENU — panels (slide in from right) */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-[76] flex flex-row text-charcoal transition-transform duration-[380ms] ease-out',
          activePanel === 'menu' ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Panel 3: deep links — leftmost */}
        <div
          className={cn(
            'hidden lg:block overflow-hidden transition-[width] duration-300 ease-out order-first',
            selectedSub ? 'w-[360px]' : 'w-0'
          )}
        >
          <section className="w-[360px] h-full bg-[#ebe8e3] border-r border-charcoal-200/60 flex flex-col">
            <div className="px-8 py-10 space-y-5 overflow-y-auto">
              {selectedSub?.links.map((item) => (
                <Link
                  key={`${selectedSub.id}-${item.label}`}
                  to={item.to}
                  onClick={() => setActivePanel(null)}
                  className="block text-[1.7rem] font-serif leading-none text-charcoal-500 hover:text-charcoal transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Panel 2: subcategories — middle */}
        <div
          className={cn(
            'hidden md:block overflow-hidden transition-[width] duration-300 ease-out',
            selectedTop ? 'w-[360px]' : 'w-0'
          )}
        >
          <section className="w-[360px] h-full bg-[#f0ede8] border-r border-charcoal-200/60 flex flex-col">
            <div className="px-8 py-10 space-y-5 overflow-y-auto flex-1">
              {selectedTop?.subs.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubId(sub.id)}
                  className={cn(
                    'w-full flex items-center justify-between text-left text-[1.7rem] font-serif leading-none transition-colors',
                    selectedSub?.id === sub.id ? 'text-charcoal' : 'text-charcoal-500 hover:text-charcoal'
                  )}
                >
                  <ChevronLeft size={16} className={cn(selectedSub?.id === sub.id ? 'opacity-100' : 'opacity-0')} />
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>
            {selectedTop && (
              <div className="px-8 py-7 border-t border-charcoal-200/60">
                <p className="text-2xs uppercase tracking-[0.2em] text-charcoal-400 mb-4">Highlights</p>
                <div className="space-y-3">
                  {selectedTop.highlights.map((item) => (
                    <Link key={`${selectedTop.id}-${item.label}`} to={item.to} onClick={() => setActivePanel(null)} className="block text-lg font-serif text-charcoal-500 hover:text-charcoal transition-colors">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Panel 1: main categories (rightmost) */}
        <section className="w-[min(360px,100vw)] bg-[#f5f3f0] border-l border-charcoal-200/60 flex flex-col shrink-0 shadow-2xl">
          <div className="px-8 py-7 flex items-center gap-7">
            <button onClick={() => setActivePanel(null)} className="inline-flex items-center gap-2 text-sm">
              <X size={18} strokeWidth={1.5} />
              <span>Close</span>
            </button>
            <button onClick={() => setActivePanel('search')} className="inline-flex items-center gap-2 text-sm">
              <Search size={18} strokeWidth={1.5} />
              <span>Search</span>
            </button>
          </div>

          <div className="px-8 py-4 space-y-5 overflow-y-auto flex-1">
            {megaMenu.map((top) => (
              <button
                key={top.id}
                onClick={() => selectTop(top.id)}
                className="w-full flex items-center justify-between text-left text-[2rem] font-serif leading-none text-charcoal-500 hover:text-charcoal transition-colors"
              >
                <ChevronLeft size={17} className={cn(top.subs.length ? 'opacity-50' : 'opacity-0', selectedTop?.id === top.id ? 'opacity-100' : '')} />
                <span className={cn(selectedTop?.id === top.id ? 'text-charcoal' : '')}>{top.label}</span>
              </button>
            ))}
          </div>

          <div className="px-8 py-6 border-t border-charcoal-200/60 space-y-3">
            <button onClick={() => setActivePanel('contact')} className="block text-sm text-charcoal-500 hover:text-charcoal transition-colors">
              Contact us
            </button>
            <p className="text-sm text-charcoal-400">Rest of the World / English</p>
          </div>
        </section>
      </div>

      {/* LEFT Panel - Contact (slides from LEFT) */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 w-full md:w-[28rem] luxury-panel z-[71] transition-transform duration-500 ease-out flex flex-col',
          isLeftPanel ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-8 py-7 border-b border-charcoal-100">
          <div>
            <p className="text-2xs font-sans tracking-[0.3em] uppercase text-charcoal-500">Concierge</p>
            <p className="font-serif text-2xl mt-1">Akwaluzto</p>
          </div>
          <button onClick={() => setActivePanel(null)} className="text-charcoal p-2 hover:bg-charcoal-100 rounded-full transition-colors">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-8 flex flex-col gap-7 flex-1">
          <div>
            <h3 className="font-serif text-3xl leading-tight mb-6">Client Services</h3>
          </div>
          <div className="space-y-4 text-sm text-charcoal-600">
            <p><span className="text-charcoal-400">Phone:</span> <a href="tel:+96171577939" className="hover:text-charcoal transition-colors">+961 71 577 939</a></p>
            <p><span className="text-charcoal-400">WhatsApp:</span> <a href="https://wa.me/96171577939" target="_blank" rel="noopener noreferrer" className="hover:text-charcoal transition-colors">+961 71 577 939</a></p>
            <p><span className="text-charcoal-400">Instagram:</span> <a href="https://instagram.com/luztocreations" target="_blank" rel="noopener noreferrer" className="hover:text-charcoal transition-colors">@luztocreations</a></p>
            <p><span className="text-charcoal-400">TikTok:</span> <a href="https://tiktok.com/@luztocreations" target="_blank" rel="noopener noreferrer" className="hover:text-charcoal transition-colors">@luztocreations</a></p>
          </div>
          <div className="pt-4 border-t border-charcoal-100 space-y-3">
            <Link to="/contact" onClick={() => setActivePanel(null)} className="block text-sm text-charcoal hover:text-taupe-dark transition-colors py-1">
              Book Styling Appointment
            </Link>
            <Link to="/account/orders" onClick={() => setActivePanel(null)} className="block text-sm text-charcoal hover:text-taupe-dark transition-colors py-1">
              Track Existing Order
            </Link>
            <Link to="/returns" onClick={() => setActivePanel(null)} className="block text-sm text-charcoal hover:text-taupe-dark transition-colors py-1">
              Aftercare & Returns Support
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT Panel - Menu, Account, Search (slides from RIGHT) */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 w-full md:w-[28rem] luxury-panel z-[71] transition-transform duration-500 ease-out flex flex-col',
          isRightPanel ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-8 py-7 border-b border-charcoal-100">
          <div>
            <p className="text-2xs font-sans tracking-[0.3em] uppercase text-charcoal-500">
              {activePanel === 'account' ? (isAuthenticated ? 'My Account' : 'Private Access') : 'Find Pieces'}
            </p>
            <p className="font-serif text-2xl mt-1">Akwaluzto</p>
          </div>
          <button onClick={() => setActivePanel(null)} className="text-charcoal p-2 hover:bg-charcoal-100 rounded-full transition-colors">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* ACCOUNT Panel */}
        {activePanel === 'account' && (
          <div className="flex-1 flex flex-col">
            {isAuthenticated ? (
              <div className="p-8 flex flex-col gap-3 flex-1">
                <div className="mb-4">
                  <p className="text-2xs tracking-[0.3em] uppercase text-charcoal-400 mb-1">Welcome</p>
                  <h3 className="font-serif text-2xl">{user?.firstName || user?.email}</h3>
                </div>
                <button onClick={() => handleNav('/account')} className="flex items-center gap-3 text-charcoal hover:text-taupe-dark transition-colors py-3 border-b border-charcoal-100">
                  <CircleUserRound size={18} strokeWidth={1.5} />
                  <span className="text-sm">Profile</span>
                </button>
                <button onClick={() => handleNav('/account/orders')} className="flex items-center gap-3 text-charcoal hover:text-taupe-dark transition-colors py-3 border-b border-charcoal-100">
                  <Package size={18} strokeWidth={1.5} />
                  <span className="text-sm">My Orders</span>
                </button>
                <button onClick={() => handleNav('/account/saved')} className="flex items-center gap-3 text-charcoal hover:text-taupe-dark transition-colors py-3 border-b border-charcoal-100">
                  <Heart size={18} strokeWidth={1.5} />
                  <span className="text-sm">Saved Items</span>
                </button>
                <button onClick={() => handleNav('/recommendations')} className="flex items-center gap-3 text-charcoal hover:text-taupe-dark transition-colors py-3 border-b border-charcoal-100">
                  <Sparkles size={18} strokeWidth={1.5} />
                  <span className="text-sm">Recommendations</span>
                </button>
                <button onClick={() => handleNav('/account/addresses')} className="flex items-center gap-3 text-charcoal hover:text-taupe-dark transition-colors py-3 border-b border-charcoal-100">
                  <MapPin size={18} strokeWidth={1.5} />
                  <span className="text-sm">Addresses</span>
                </button>
                <button onClick={() => { logout(); setActivePanel(null) }} className="flex items-center gap-3 text-charcoal hover:text-red-600 transition-colors py-3 mt-auto">
                  <LogOut size={18} strokeWidth={1.5} />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="p-8 flex flex-col gap-5 flex-1">
                <div>
                  <h3 className="font-serif text-3xl leading-tight mb-2">{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h3>
                  <p className="text-sm text-charcoal-400">{authMode === 'signin' ? 'Access your orders and saved items' : 'Join for exclusive access'}</p>
                </div>

                {authError && (
                  <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded space-y-2">
                    <p>{authError}</p>
                    {pendingVerificationEmail && (
                      <button
                        type="button"
                        disabled={resendStatus !== 'idle'}
                        onClick={async () => {
                          setResendStatus('sending')
                          try {
                            await resendVerification(pendingVerificationEmail)
                            setResendStatus('sent')
                          } catch {
                            setResendStatus('idle')
                          }
                        }}
                        className="underline text-red-700 disabled:opacity-60"
                      >
                        {resendStatus === 'sending' ? 'Sending...' : resendStatus === 'sent' ? 'Verification email sent!' : 'Resend verification email'}
                      </button>
                    )}
                  </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="grid grid-cols-2 gap-3">
                      <input name="firstName" type="text" placeholder="First Name" className="border border-charcoal-200 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
                      <input name="lastName" type="text" placeholder="Last Name" className="border border-charcoal-200 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
                    </div>
                  )}
                  <input name="email" type="email" required placeholder="Email address" className="w-full border border-charcoal-200 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} required minLength={8} placeholder="Password (min 8 characters)" className="w-full border border-charcoal-200 bg-white px-3 py-2.5 pr-10 text-sm text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-charcoal-400 hover:text-charcoal transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button type="submit" disabled={authLoading} className="w-full bg-charcoal text-cream py-3.5 text-xs tracking-[0.2em] uppercase hover:bg-charcoal/90 transition-colors disabled:opacity-50">
                    {authLoading ? (authMode === 'signin' ? 'Signing In...' : 'Creating Account...') : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
                  </button>
                </form>

                <div className="pt-4 text-center space-y-3">
                  <button
                    onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); setShowPassword(false) }}
                    className="block w-full text-sm text-charcoal-500 underline hover:text-charcoal transition-colors"
                  >
                    {authMode === 'signin' ? 'Don\'t have an account? Create one' : 'Already have an account? Sign in'}
                  </button>
                  {authMode === 'signin' && (
                    <Link
                      to="/forgot-password"
                      onClick={() => setActivePanel(null)}
                      className="block text-sm text-charcoal-500 underline hover:text-charcoal transition-colors"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>

                <div className="mt-auto pt-6 border-t border-charcoal-100 text-xs text-charcoal-400 text-center">
                  <p>By continuing, you agree to our Terms of Service and Privacy Policy.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEARCH Panel */}
        {activePanel === 'search' && (
          <div className="p-8 flex flex-col gap-6">
            <div>
              <p className="text-2xs tracking-[0.3em] uppercase text-charcoal-400 mb-2">Find Pieces</p>
              <h3 className="font-serif text-3xl leading-tight">Search the Collection</h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value; if (q) { navigate(`/shop?search=${encodeURIComponent(q)}`); setActivePanel(null) } }} className="space-y-4">
              <input
                name="q"
                type="search"
                placeholder="Search products, categories..."
                className="w-full border border-charcoal-200 bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal"
                autoFocus
              />
              <button type="submit" className="w-full bg-charcoal text-cream py-3 text-xs tracking-[0.2em] uppercase hover:bg-charcoal/90 transition-colors">
                Search
              </button>
            </form>
            <div className="pt-4 border-t border-charcoal-100">
              <p className="text-sm text-charcoal-400 mb-3">Quick Links</p>
              <div className="flex flex-wrap gap-2">
                {['New Arrivals', 'Men', 'Women', 'Accessories'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { navigate(tag === 'New Arrivals' ? '/new-arrivals' : `/${tag.toLowerCase()}`); setActivePanel(null) }}
                    className="text-xs px-3 py-1.5 border border-charcoal-200 text-charcoal hover:bg-charcoal hover:text-cream transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
