import { Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { ChatWidget } from '@/components/ui/ChatWidget'
import { HomePage } from '@/pages/HomePage'
import { ShopPage } from '@/pages/ShopPage'
import { ProductPage } from '@/pages/ProductPage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { OrderConfirmedPage } from '@/pages/OrderConfirmedPage'
import { StaticPage } from '@/pages/StaticPage'
import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="min-h-screen pt-24 flex flex-col items-center justify-center gap-6 text-center px-6">
      <p className="font-serif text-6xl text-cream">404</p>
      <p className="text-cream/50 text-sm font-sans">The page you were looking for doesn't exist.</p>
      <Link to="/" className="text-2xs font-sans tracking-widest uppercase text-cream border-b border-cream/40 pb-px hover:text-cream/70 transition-colors">
        Back to Home
      </Link>
    </div>
  )
}
import { CatalogDivisionPage } from '@/pages/CatalogDivisionPage'
import { CatalogCategoryPage } from '@/pages/CatalogCategoryPage'
import { NewArrivalsPage } from '@/pages/NewArrivalsPage'
import { RecommendationsPage } from '@/pages/RecommendationsPage'
import { AccountPage } from '@/pages/AccountPage'
import { AccountOrdersPage } from '@/pages/AccountOrdersPage'
import { AccountWishlistPage } from '@/pages/AccountWishlistPage'
import { AccountAddressesPage } from '@/pages/AccountAddressesPage'
import { ContactPage } from '@/pages/ContactPage'
import { AboutPage } from '@/pages/AboutPage'
import { FAQPage } from '@/pages/FAQPage'
import { ReturnsPage } from '@/pages/ReturnsPage'
import { ShippingPage } from '@/pages/ShippingPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { TermsPage } from '@/pages/TermsPage'
import { AdminLoginPage } from '@/pages/AdminLoginPage'
import { AdminDashboardPage } from '@/pages/AdminDashboardPage'
import { VerifyEmailPage } from '@/pages/VerifyEmailPage'
import { UnsubscribePage } from '@/pages/UnsubscribePage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { ConfirmDeletePage } from '@/pages/ConfirmDeletePage'
import { ConfirmPasswordChangePage } from '@/pages/ConfirmPasswordChangePage'
import { AccountPaymentMethodsPage } from '@/pages/AccountPaymentMethodsPage'

function RootApp() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <ErrorBoundary>
    <AuthProvider>
    <div className="min-h-screen flex flex-col">
      {!isAdminRoute && <Header />}
      {!isAdminRoute && <CartDrawer />}
      {!isAdminRoute && <ChatWidget />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/:slug" element={<ProductPage />} />
          <Route path="/new-arrivals" element={<NewArrivalsPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/men" element={<CatalogDivisionPage divisionKey="men" />} />
          <Route path="/women" element={<CatalogDivisionPage divisionKey="women" />} />
          <Route path="/accessories" element={<CatalogDivisionPage divisionKey="accessories" />} />
          <Route path="/men/:category" element={<CatalogCategoryPage divisionKey="men" />} />
          <Route path="/women/:category" element={<CatalogCategoryPage divisionKey="women" />} />
          <Route path="/accessories/:category" element={<CatalogCategoryPage divisionKey="accessories" />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmed/:id" element={<OrderConfirmedPage />} />
          <Route path="/order-confirmed" element={<OrderConfirmedPage />} />
          <Route path="/collections" element={<StaticPage title="Collections" />} />
          <Route path="/drops" element={<StaticPage title="New Drop" />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/orders" element={<AccountOrdersPage />} />
          <Route path="/account/saved" element={<AccountWishlistPage />} />
          <Route path="/account/addresses" element={<AccountAddressesPage />} />
          <Route path="/account/payment-methods" element={<AccountPaymentMethodsPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/confirm-delete" element={<ConfirmDeletePage />} />
          <Route path="/confirm-password-change" element={<ConfirmPasswordChangePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default RootApp
