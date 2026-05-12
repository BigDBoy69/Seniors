import { Link } from 'react-router-dom'
import { ArrowRight, Package, RefreshCw, Shield, Clock } from 'lucide-react'

export function ReturnsPage() {
  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-2xs uppercase tracking-[0.4em] text-cream/45 mb-4">Aftercare</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream mb-6">Returns & Exchanges</h1>
          <p className="text-cream/65 leading-relaxed">
            We want you to be completely satisfied with your purchase. 
            Our straightforward returns process ensures peace of mind with every order.
          </p>
        </div>

        {/* Policy Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="luxury-surface p-8 text-center">
            <Clock className="w-8 h-8 mx-auto mb-4 text-charcoal-400" strokeWidth={1.5} />
            <p className="font-serif text-xl text-charcoal mb-2">14-Day Window</p>
            <p className="text-sm text-charcoal-600">Return full-priced items within 14 days of delivery</p>
          </div>
          <div className="luxury-surface p-8 text-center">
            <Shield className="w-8 h-8 mx-auto mb-4 text-charcoal-400" strokeWidth={1.5} />
            <p className="font-serif text-xl text-charcoal mb-2">Condition Standards</p>
            <p className="text-sm text-charcoal-600">Items must be unworn with original tags attached</p>
          </div>
          <div className="luxury-surface p-8 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 text-charcoal-400" strokeWidth={1.5} />
            <p className="font-serif text-xl text-charcoal mb-2">Easy Process</p>
            <p className="text-sm text-charcoal-600">Initiate returns through your account or contact us</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Eligibility */}
          <div>
            <h2 className="font-serif text-2xl text-cream mb-8">Return Eligibility</h2>
            <div className="space-y-6 text-cream/70">
              <div className="flex gap-4">
                <span className="text-cream/45 shrink-0">01</span>
                <div>
                  <p className="text-cream mb-1">Full-Priced Items</p>
                  <p className="text-sm">All full-priced items are eligible for return within 14 days of delivery. Items must be unworn, unwashed, and in original condition with all tags attached.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-cream/45 shrink-0">02</span>
                <div>
                  <p className="text-cream mb-1">Sale Items</p>
                  <p className="text-sm">Items marked as "Final Sale" cannot be returned or exchanged. All sale purchases are non-refundable unless the item is defective.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-cream/45 shrink-0">03</span>
                <div>
                  <p className="text-cream mb-1">Accessories & Intimates</p>
                  <p className="text-sm">For hygiene reasons, earrings, underwear, and swimwear cannot be returned unless the packaging remains unopened.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-cream/45 shrink-0">04</span>
                <div>
                  <p className="text-cream mb-1">Defective Items</p>
                  <p className="text-sm">If you receive a defective or incorrect item, please contact us within 48 hours of delivery for immediate assistance.</p>
                </div>
              </div>
            </div>
          </div>

          {/* How to Return */}
          <div className="luxury-surface p-8 lg:p-10">
            <h2 className="font-serif text-2xl text-charcoal mb-8">How to Return</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-charcoal-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-charcoal">1</span>
                </div>
                <div>
                  <p className="text-charcoal font-medium mb-1">Initiate Return</p>
                  <p className="text-sm text-charcoal-600">Log into your account, navigate to "My Orders," select the order and items you wish to return, and follow the instructions. Or contact our customer service team.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-charcoal-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-charcoal">2</span>
                </div>
                <div>
                  <p className="text-charcoal font-medium mb-1">Package Items</p>
                  <p className="text-sm text-charcoal-600">Place items in the original packaging or a secure box. Include the return slip or a note with your order number. Ensure all tags remain attached.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-charcoal-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-charcoal">3</span>
                </div>
                <div>
                  <p className="text-charcoal font-medium mb-1">Ship Return</p>
                  <p className="text-sm text-charcoal-600">Use the provided return label or ship to the address on your return slip. We recommend using a trackable shipping method.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-charcoal-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-charcoal">4</span>
                </div>
                <div>
                  <p className="text-charcoal font-medium mb-1">Receive Refund</p>
                  <p className="text-sm text-charcoal-600">Once we receive and inspect your return, your refund will be processed within 5-7 business days to the original payment method.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-16 border-t border-cream/10 pt-16">
          <h2 className="font-serif text-2xl text-cream mb-6">Important Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-cream/65 text-sm">
            <ul className="space-y-3 list-disc list-inside">
              <li>Original shipping costs are non-refundable</li>
              <li>Return shipping is the customer's responsibility unless the item is defective</li>
              <li>Items damaged by wear, washing, or alteration cannot be returned</li>
              <li>Gift cards and store credit are non-refundable</li>
            </ul>
            <ul className="space-y-3 list-disc list-inside">
              <li>Exchanges are subject to availability; we recommend placing a new order</li>
              <li>International returns may take longer to process</li>
              <li>All returns are inspected before refunds are issued</li>
              <li>We reserve the right to refuse returns that don't meet policy requirements</li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-cream/65 mb-4">Need help with a return?</p>
          <Link to="/contact" className="inline-flex items-center gap-2 text-cream hover:text-cream/80 transition-colors">
            <span className="text-sm uppercase tracking-widest">Contact Customer Service</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
