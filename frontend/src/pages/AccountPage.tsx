import { useState } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { updateProfile, changePassword, resendVerification, requestAccountDeletion } from '@/lib/api'
// changePassword is kept for type reference; actual call goes through the email-confirmed flow
import { getAuthToken } from '@/hooks/useAuth'
import { PasswordInput } from '@/components/ui/PasswordInput'

export function AccountPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [message, setMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordEmailSent, setPasswordEmailSent] = useState(false)
  const [resendingVerification, setResendingVerification] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')
  const [deletionRequested, setDeletionRequested] = useState(false)
  const [deletionError, setDeletionError] = useState('')
  const [requestingDeletion, setRequestingDeletion] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 bg-[#0f0d0c]">
        <div className="max-w-8xl mx-auto px-6 lg:px-12 py-12 text-cream">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const token = getAuthToken()
    if (!token) return
    try {
      await updateProfile(token, { firstName, lastName, phone })
      setMessage('Profile updated successfully')
    } catch {
      setMessage('Failed to update profile')
    }
  }

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordMessage('')
    const form = e.currentTarget
    const fd = new FormData(form)
    const currentPassword = fd.get('currentPassword') as string
    const newPassword = fd.get('newPassword') as string
    const confirmPassword = fd.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match')
      return
    }

    const token = getAuthToken()
    if (!token) return
    try {
      await changePassword(token, currentPassword, newPassword)
      setPasswordEmailSent(true)
      form.reset()
    } catch (err: any) {
      setPasswordMessage(err?.message || 'Failed to send confirmation email')
    }
  }

  const handleResendVerification = async () => {
    if (!user?.email) return
    setResendingVerification(true)
    setVerificationMessage('')
    
    try {
      const data = await resendVerification(user.email)
      setVerificationMessage(data.message || 'Verification email sent')
    } catch {
      setVerificationMessage('Failed to resend verification email')
    } finally {
      setResendingVerification(false)
    }
  }

  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-12">
        <div className="mb-10">
          <p className="text-2xs uppercase tracking-[0.3em] text-cream/50 mb-3">Account</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream">Welcome, {user?.firstName || 'Guest'}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-16">
          <aside className="space-y-2">
            <Link to="/account" className="block text-sm text-cream py-2 border-b border-cream/20">
              Profile
            </Link>
            <Link to="/account/orders" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
              My Orders
            </Link>
            <Link to="/account/saved" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
              Saved Items
            </Link>
            <Link to="/recommendations" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
              Recommendations
            </Link>
            <Link to="/account/addresses" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
              Addresses
            </Link>
            <button onClick={logout} className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors mt-6">
              Sign Out
            </button>
          </aside>

          <div className="lg:col-span-3 space-y-12">
            {!user?.emailVerified && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-charcoal mb-1">Email Not Verified</h3>
                    <p className="text-sm text-charcoal-700 mb-3">
                      Please verify your email address to access all account features.
                    </p>
                    <button
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="text-sm text-charcoal font-medium underline hover:no-underline disabled:opacity-50"
                    >
                      {resendingVerification ? 'Sending...' : 'Resend verification email'}
                    </button>
                    {verificationMessage && (
                      <p className="text-sm text-charcoal-700 mt-2">{verificationMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {user?.emailVerified && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-900">Email verified</p>
                </div>
              </div>
            )}

            <section className="luxury-surface p-8 lg:p-10">
              <h2 className="font-serif text-2xl text-charcoal mb-6">Personal Information</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal focus:outline-none focus:border-charcoal"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal focus:outline-none focus:border-charcoal"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal/50"
                  />
                </div>
                <div>
                  <label className="block text-2xs uppercase tracking-widest text-charcoal-400 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal focus:outline-none focus:border-charcoal"
                  />
                </div>
                {message && <p className="text-sm text-charcoal-500">{message}</p>}
                <button type="submit" className="bg-charcoal text-cream px-8 py-3 text-xs uppercase tracking-widest hover:bg-charcoal/90 transition-colors">
                  Save Changes
                </button>
              </form>
            </section>

            <section className="luxury-surface p-8 lg:p-10">
              <h2 className="font-serif text-2xl text-charcoal mb-6">Change Password</h2>
              {passwordEmailSent ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 max-w-md">
                  <p className="text-sm font-medium text-amber-900 mb-1">Check your email</p>
                  <p className="text-sm text-amber-800">
                    We sent a confirmation link to <strong>{user?.email}</strong>. Click it to apply your new password. The link expires in 1 hour.
                  </p>
                  <button
                    onClick={() => { setPasswordEmailSent(false); setPasswordMessage('') }}
                    className="mt-4 text-xs uppercase tracking-widest text-amber-900 underline"
                  >
                    Send again
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                  <PasswordInput
                    name="currentPassword"
                    label="Current Password"
                    required
                    className="border-0 border-b border-charcoal-200 rounded-none px-0"
                  />
                  <PasswordInput
                    name="newPassword"
                    label="New Password"
                    required
                    minLength={8}
                    className="border-0 border-b border-charcoal-200 rounded-none px-0"
                  />
                  <PasswordInput
                    name="confirmPassword"
                    label="Confirm New Password"
                    required
                    minLength={8}
                    className="border-0 border-b border-charcoal-200 rounded-none px-0"
                  />
                  {passwordMessage && <p className="text-sm text-red-600">{passwordMessage}</p>}
                  <button type="submit" className="bg-charcoal text-cream px-8 py-3 text-xs uppercase tracking-widest hover:bg-charcoal/90 transition-colors">
                    Update Password
                  </button>
                </form>
              )}
            </section>

            {/* Delete Account Section */}
            <section className="luxury-surface p-8 lg:p-10 border-red-200">
              <h2 className="font-serif text-2xl text-red-600 mb-4">Delete Account</h2>
              <p className="text-sm text-charcoal-500 mb-6 max-w-md">
                Permanently remove your account and associated data. This action cannot be undone. We will send a confirmation email first.
              </p>

              {deletionRequested ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 max-w-md">
                  <p className="text-sm font-medium text-amber-900 mb-1">Check your email</p>
                  <p className="text-sm text-amber-800">
                    We sent a confirmation link to <strong>{user?.email}</strong>. Click the link to permanently delete your account. The link expires in 1 hour.
                  </p>
                </div>
              ) : (
                <>
                  {deletionError && (
                    <p className="text-sm text-red-600 mb-4">{deletionError}</p>
                  )}
                  <button
                    onClick={async () => {
                      setDeletionError('');
                      setRequestingDeletion(true);
                      const token = getAuthToken();
                      if (!token) { setRequestingDeletion(false); return; }
                      try {
                        await requestAccountDeletion(token);
                        setDeletionRequested(true);
                      } catch (err: any) {
                        setDeletionError(err?.message || 'Failed to send deletion email. Please try again.');
                      } finally {
                        setRequestingDeletion(false);
                      }
                    }}
                    disabled={requestingDeletion}
                    className="border-2 border-red-600 text-red-600 px-6 py-3 text-xs uppercase tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {requestingDeletion ? 'Sending...' : 'Request Account Deletion'}
                  </button>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
