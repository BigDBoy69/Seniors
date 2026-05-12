import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { resetPassword } from '@/lib/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid reset link');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const data = await resetPassword(token!, password);
      setStatus('success');
      setMessage(data.message || 'Password reset successfully');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    }
  };

  if (!token || (status === 'error' && message === 'Invalid reset link')) {
    return (
      <div className="min-h-screen pt-24 bg-[#0f0d0c] flex items-center justify-center">
        <div className="max-w-md mx-auto px-6">
          <div className="luxury-surface p-8 text-center">
            <h1 className="font-serif text-2xl mb-4 text-cream">Invalid Reset Link</h1>
            <p className="text-cream/60 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block bg-charcoal text-cream px-6 py-3 text-xs tracking-[0.2em] uppercase hover:bg-charcoal/90 transition-colors"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 bg-[#0f0d0c]">
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="luxury-surface p-8">
          <h1 className="font-serif text-3xl mb-2 text-cream">Reset Password</h1>
          <p className="text-sm text-cream/60 mb-6">
            Enter your new password below.
          </p>

          {status === 'success' ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded text-sm text-green-800">
                {message}
              </div>
              <p className="text-sm text-cream/60">
                Redirecting to sign in...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-600">
                  {message}
                </div>
              )}

              <PasswordInput
                label="New Password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                disabled={status === 'loading'}
              />

              <PasswordInput
                label="Confirm New Password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                disabled={status === 'loading'}
              />

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-charcoal text-cream py-3 text-xs tracking-[0.2em] uppercase hover:bg-charcoal/90 transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="text-center pt-4">
                <Link
                  to="/"
                  className="text-sm text-cream/60 underline hover:text-cream transition-colors"
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
