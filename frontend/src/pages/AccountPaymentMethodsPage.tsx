import { Link } from 'react-router-dom'

export function AccountPaymentMethodsPage() {
  return (
    <div className="min-h-screen pt-24 bg-[#0f0d0c] px-6">
      <div className="max-w-2xl mx-auto pt-16">
        <h1 className="font-serif text-4xl text-cream mb-4">Payment Methods</h1>
        <p className="text-cream/60 text-sm leading-relaxed mb-8">
          Payment is collected at the time of delivery. No card details are required to place an order.
        </p>
        <p className="text-cream/40 text-xs uppercase tracking-widest mb-8">
          Currently accepted: Cash on Delivery
        </p>
        <Link
          to="/account/orders"
          className="text-2xs font-sans tracking-widest uppercase text-cream border-b border-cream/40 pb-px hover:text-cream/70 hover:border-cream/20 transition-colors"
        >
          View my orders
        </Link>
      </div>
    </div>
  )
}
