import { useState } from 'react'
import { submitContact } from '@/lib/api'
import { Phone, Clock, MapPin } from 'lucide-react'

export function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    topic: 'GENERAL',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')
    
    try {
      await submitContact(formState)
      setStatus('success')
      setFormState({ name: '', email: '', phone: '', topic: 'GENERAL', subject: '', message: '' })
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err?.message || 'Failed to send message. Please try again.')
    }
  }

  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-2xs uppercase tracking-[0.4em] text-cream/45 mb-4">Client Services</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream mb-6">Contact Us</h1>
          <p className="text-cream/65 leading-relaxed max-w-xl mx-auto">
            Our dedicated team is here to assist you with orders, styling advice, returns, and any questions about our collections.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Contact Methods */}
          <div className="space-y-8">
            <div className="luxury-surface p-8">
              <h2 className="font-serif text-2xl text-charcoal mb-8">Get in Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-charcoal-400 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-charcoal mb-1">Phone</p>
                    <a href="tel:+96171577939" className="text-charcoal-600 hover:text-charcoal transition-colors">
                      +961 71 577 939
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <svg className="w-5 h-5 text-charcoal-400 mt-0.5" strokeWidth={1.5} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-charcoal mb-1">WhatsApp</p>
                    <a href="https://wa.me/96171577939" target="_blank" rel="noopener noreferrer" className="text-charcoal-600 hover:text-charcoal transition-colors">
                      +961 71 577 939
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <svg className="w-5 h-5 text-charcoal-400 mt-0.5" strokeWidth={1.5} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-charcoal mb-1">Social Media</p>
                    <div className="space-y-1">
                      <a href="https://instagram.com/luztocreations" target="_blank" rel="noopener noreferrer" className="block text-charcoal-600 hover:text-charcoal transition-colors">
                        Instagram: @luztocreations
                      </a>
                      <a href="https://tiktok.com/@luztocreations" target="_blank" rel="noopener noreferrer" className="block text-charcoal-600 hover:text-charcoal transition-colors">
                        TikTok: @luztocreations
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-charcoal-400 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-charcoal mb-1">Hours</p>
                    <p className="text-charcoal-600">Monday — Saturday</p>
                    <p className="text-charcoal-600">10:00 — 19:00 (GMT+2)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-charcoal-400 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-charcoal mb-1">Location</p>
                    <p className="text-charcoal-600">Koura Amioun, Lebanon</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#151210] p-8">
              <h3 className="font-serif text-xl text-cream mb-4">Response Times</h3>
              <p className="text-sm text-cream/65 leading-relaxed">
                We aim to respond to all inquiries within 24 hours during business days. 
                For urgent order-related matters, please call our direct line.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="luxury-surface p-8 lg:p-10">
            <h2 className="font-serif text-2xl text-charcoal mb-2">Send a Message</h2>
            <p className="text-sm text-charcoal-500 mb-8">Fill out the form below and we will respond shortly.</p>

            {status === 'success' ? (
              <div className="text-center py-12">
                <p className="font-serif text-2xl text-charcoal mb-3">Thank You</p>
                <p className="text-charcoal-600">Your message has been received. Our team will respond within 24 hours.</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="mt-6 text-sm text-charcoal underline hover:text-taupe-dark transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">Name *</label>
                    <input
                      type="text"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal focus:outline-none focus:border-charcoal"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal focus:outline-none focus:border-charcoal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formState.phone}
                      onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                      className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal focus:outline-none focus:border-charcoal"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">Topic</label>
                    <select
                      value={formState.topic}
                      onChange={(e) => setFormState({ ...formState, topic: e.target.value })}
                      className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal focus:outline-none focus:border-charcoal"
                    >
                      <option value="GENERAL">General Inquiry</option>
                      <option value="ORDER">Order Support</option>
                      <option value="RETURNS">Returns & Exchanges</option>
                      <option value="STYLING">Styling Appointment</option>
                      <option value="COLLAB">Collaborations</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">Subject</label>
                  <input
                    type="text"
                    value={formState.subject}
                    onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                    className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal focus:outline-none focus:border-charcoal"
                  />
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">Message *</label>
                  <textarea
                    required
                    minLength={10}
                    rows={5}
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    className="w-full border border-charcoal-200 bg-transparent p-3 text-charcoal focus:outline-none focus:border-charcoal resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-charcoal text-cream py-3.5 text-xs uppercase tracking-[0.2em] hover:bg-charcoal/90 transition-colors disabled:opacity-50"
                >
                  {status === 'submitting' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
