import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '@/lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const data = await forgotPassword(email);
      setStatus('success');
      setMessage(data.message || 'If that email exists, a password reset link has been sent');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to send reset link. Please try again.');
    }
  };

  return (
    <div className="min-h-screen pt-24 bg-[#0f0d0c]">
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="luxury-surface p-8">
          <h1 className="font-serif text-3xl mb-2 text-charcoal">Forgot Password</h1>
          <p className="text-sm text-charcoal-500 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {status === 'success' ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded text-sm text-green-800">
                {message}
              </div>
              <p className="text-sm text-charcoal-500">
                Please check your email inbox and spam folder for the password reset link.
              </p>
              <Link
                to="/"
                className="block text-center w-full bg-charcoal text-cream py-3 text-xs tracking-[0.2em] uppercase hover:bg-charcoal/90 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-600">
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-charcoal">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-charcoal-200 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal"
                  disabled={status === 'loading'}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-charcoal text-cream py-3 text-xs tracking-[0.2em] uppercase hover:bg-charcoal/90 transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-4">
                <Link
                  to="/"
                  className="text-sm text-charcoal-500 underline hover:text-charcoal transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
