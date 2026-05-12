import { useState, type FormEvent } from 'react'
import { subscribeNewsletter } from '@/lib/api'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    try {
      await subscribeNewsletter(email)
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return <p className="text-base font-sans text-cream/80 border border-cream/20 px-8 py-5">You&apos;re on the list. Thank you.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row max-w-lg mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        required
        className="flex-1 bg-transparent border border-cream/20 px-6 py-4 text-base font-sans text-cream placeholder:text-cream/30 focus:outline-none focus:border-cream/50 transition-colors"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-transparent border border-cream/20 sm:border-l-0 sm:mt-0 mt-[-1px] text-cream text-2xs font-sans tracking-widest uppercase px-8 py-4 hover:bg-cream hover:text-charcoal transition-all duration-300 disabled:opacity-50"
      >
        {status === 'loading' ? '...' : 'Subscribe'}
      </button>
      {status === 'error' && <p className="text-2xs text-red-400 mt-4 w-full text-center">Something went wrong. Please try again.</p>}
    </form>
  )
}
