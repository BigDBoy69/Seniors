import { Link } from 'react-router-dom'
import { Truck, Globe, Clock, Package } from 'lucide-react'

export function ShippingPage() {
  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-2xs uppercase tracking-[0.4em] text-cream/45 mb-4">Delivery</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream mb-6">Shipping & Delivery</h1>
          <p className="text-cream/65 leading-relaxed">
            We ship worldwide from our atelier in Beirut. Every order is carefully packed 
            and delivered with the same care that goes into creating our pieces.
          </p>
        </div>

        {/* Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="luxury-surface p-8 text-center">
            <Truck className="w-8 h-8 mx-auto mb-4 text-charcoal-400" strokeWidth={1.5} />
            <p className="font-serif text-xl text-charcoal mb-2">Standard</p>
            <p className="text-sm text-charcoal-600 mb-3">3-5 Business Days</p>
            <p className="text-xs text-charcoal-400">Lebanon: Free over $100<br/>International: $15-25</p>
          </div>
          <div className="luxury-surface p-8 text-center">
            <Clock className="w-8 h-8 mx-auto mb-4 text-charcoal-400" strokeWidth={1.5} />
            <p className="font-serif text-xl text-charcoal mb-2">Express</p>
            <p className="text-sm text-charcoal-600 mb-3">1-2 Business Days</p>
            <p className="text-xs text-charcoal-400">Lebanon: Free over $250<br/>International: $25-45</p>
          </div>
          <div className="luxury-surface p-8 text-center">
            <Globe className="w-8 h-8 mx-auto mb-4 text-charcoal-400" strokeWidth={1.5} />
            <p className="font-serif text-xl text-charcoal mb-2">International</p>
            <p className="text-sm text-charcoal-600 mb-3">5-10 Business Days</p>
            <p className="text-xs text-charcoal-400">Duties may apply<br/>Trackable shipping</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Lebanon Info */}
          <div className="bg-[#151210] p-8 lg:p-10">
            <h2 className="font-serif text-2xl text-cream mb-8">Lebanon Delivery</h2>
            <div className="space-y-6 text-cream/70">
              <div>
                <p className="text-cream mb-1">Beirut Same-Day</p>
                <p className="text-sm">Available for orders placed before 12:00 PM, Monday through Saturday. Complimentary for orders over $200.</p>
              </div>
              <div>
                <p className="text-cream mb-1">Standard Delivery</p>
                <p className="text-sm">1-2 business days to major cities, 2-3 days to other regions. Free for orders over $100.</p>
              </div>
              <div>
                <p className="text-cream mb-1">Cash on Delivery</p>
                <p className="text-sm">Available throughout Lebanon. Exact cash amount required; our courier cannot provide change.</p>
              </div>
            </div>
          </div>

          {/* International Info */}
          <div className="bg-[#151210] p-8 lg:p-10">
            <h2 className="font-serif text-2xl text-cream mb-8">International Shipping</h2>
            <div className="space-y-6 text-cream/70">
              <div>
                <p className="text-cream mb-1">Middle East</p>
                <p className="text-sm">3-5 business days via DHL Express. Duty-free to UAE, Saudi Arabia, Qatar, and Kuwait.</p>
              </div>
              <div>
                <p className="text-cream mb-1">Europe & UK</p>
                <p className="text-sm">5-7 business days. Customs duties and VAT may apply depending on your country and order value.</p>
              </div>
              <div>
                <p className="text-cream mb-1">Americas & Asia</p>
                <p className="text-sm">7-10 business days. All duties, taxes, and customs fees are the responsibility of the recipient.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Info */}
        <div className="mt-16 border-t border-cream/10 pt-16">
          <h2 className="font-serif text-2xl text-cream mb-8">Important Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-cream/65 text-sm">
            <div className="space-y-4">
              <h3 className="text-cream text-sm uppercase tracking-widest">Processing Times</h3>
              <p>Orders are processed and shipped within 1-2 business days. During sale periods or new collection launches, processing may take an additional 1-2 days. You will receive a shipping confirmation email with tracking once your order ships.</p>
              
              <h3 className="text-cream text-sm uppercase tracking-widest mt-6">Tracking</h3>
              <p>All shipments include tracking. You can track your order using the link in your shipping confirmation email or by logging into your account and viewing your order history.</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-cream text-sm uppercase tracking-widest">Customs & Duties</h3>
              <p>International orders may be subject to import duties, taxes, and customs fees. These charges are determined by your local customs authority and are the responsibility of the recipient. We recommend contacting your local customs office for specific information.</p>
              
              <h3 className="text-cream text-sm uppercase tracking-widest mt-6">Address Accuracy</h3>
              <p>Please ensure your shipping address is complete and accurate. We are not responsible for delays or non-delivery due to incorrect addresses. Address changes must be requested within 2 hours of order placement.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-cream/65 mb-4">Questions about delivery?</p>
          <Link to="/contact" className="inline-flex items-center bg-cream text-charcoal text-xs font-sans tracking-[0.2em] uppercase px-10 py-4 hover:bg-cream/90 transition-colors">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}
