import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '@/lib/adminApi'
import { Eye, EyeOff } from 'lucide-react'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await adminLogin(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-root min-h-screen bg-gray-100 flex items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white border border-gray-200 shadow-sm p-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">Admin</p>
          <h1 className="font-serif text-4xl text-gray-900">Akwaluzto CMS</h1>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-600"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Password
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 pr-12 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full bg-gray-900 text-white py-3 text-sm uppercase tracking-[0.15em] hover:bg-gray-800 transition-colors disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
