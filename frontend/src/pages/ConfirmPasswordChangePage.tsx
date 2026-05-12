import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { request } from '@/lib/transport'

type Status = 'loading' | 'success' | 'error'

export function ConfirmPasswordChangePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Invalid link. No token found.')
      return
    }

    request<{ success: boolean; message: string }>(
      `/api/auth/confirm-password-change?token=${encodeURIComponent(token)}`
    )
      .then((data) => {
        setStatus('success')
        setMessage(data.message)
        setTimeout(() => navigate('/account'), 3000)
      })
      .catch((err: any) => {
        setStatus('error')
        setMessage(err?.message || 'This link is invalid or has expired. Please request a new password change from your account settings.')
      })
  }, [])

  return (
    <div className="min-h-screen pt-24 bg-[#0f0d0c] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-2 border-cream/30 border-t-cream rounded-full animate-spin mx-auto" />
            <p className="text-cream/50 text-sm font-sans">Confirming password change...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-serif text-2xl text-cream mb-2">Password Updated</p>
              <p className="text-cream/50 text-sm font-sans">{message}</p>
              <p className="text-cream/30 text-xs font-sans mt-2">Redirecting to account settings...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-serif text-2xl text-cream mb-2">Link Invalid</p>
              <p className="text-cream/50 text-sm font-sans">{message}</p>
            </div>
            <Link
              to="/account"
              className="inline-block text-2xs font-sans tracking-widest uppercase text-cream border-b border-cream/40 pb-px hover:text-cream/70 transition-colors"
            >
              Back to Account Settings
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
