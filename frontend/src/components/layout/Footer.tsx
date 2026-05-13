import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeNewsletter } from '@/lib/api'

export function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    try {
      await subscribeNewsletter(email, 'footer')
      setEmail('')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <footer className="bg-[#070606] text-cream/85 border-t border-cream/10">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-20 lg:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-14 lg:gap-20">
          <div>
            <p className="text-2xs uppercase tracking-[0.35em] text-cream/60 mb-7">Customer Care</p>
            <ul className="space-y-3.5">
              {[
                { to: '/contact', label: 'Contact Us' },
                { to: '/faq', label: 'FAQs' },
                { to: '/shipping', label: 'Shipping' },
                { to: '/returns', label: 'Returns' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-cream/70 hover:text-cream transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-2xs uppercase tracking-[0.35em] text-cream/60 mb-7">Company</p>
            <ul className="space-y-3.5">
              {[
                { to: '/about', label: 'About' },
                { to: '/contact', label: 'Contact' },
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-cream/70 hover:text-cream transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:pl-4 lg:pl-10">
            <p className="text-2xs uppercase tracking-[0.35em] text-cream/60 mb-4">Newsletter</p>
            <h3 className="font-serif text-3xl text-cream mb-3">Join the Akwaluzto list</h3>
            <p className="text-sm text-cream/65 mb-8 max-w-md">
              Receive early access to new arrivals, curated edits, and private brand updates.
            </p>
            <form onSubmit={onSubmit} className="space-y-4 max-w-md">
              <div className="border-b border-cream/30 focus-within:border-cream transition-colors">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full bg-transparent py-3 text-sm text-cream placeholder:text-cream/50 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="text-2xs uppercase tracking-[0.3em] text-cream/80 hover:text-cream transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'Submitting...' : 'Subscribe'}
              </button>
              {status === 'success' && <p className="text-xs text-cream/70">You’re subscribed. Thank you.</p>}
              {status === 'error' && <p className="text-xs text-red-300">Unable to subscribe right now.</p>}
            </form>
          </div>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="max-w-8xl mx-auto px-6 lg:px-12 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-2xs tracking-[0.18em] uppercase text-cream/50">© {new Date().getFullYear()} Akwaluzto. All rights reserved.</p>
          <p className="text-2xs text-cream/45">Independent fashion house</p>
        </div>
      </div>
    </footer>
  )
}
