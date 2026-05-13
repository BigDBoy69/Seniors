import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { request } from '@/lib/transport';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  // Prevents double-invocation in React Strict Mode (dev) where effects fire twice.
  // No AbortController is used here intentionally — aborting the first run and
  // blocking the second (via this ref) would mean verification never fires.
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    if (hasVerified.current) return;
    hasVerified.current = true;

    const verifyEmail = async () => {
      try {
        const data = await request<{ success: boolean; message: string }>(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`
        );
        if (data.success) {
          setStatus('success');
          setMessage(data.message);
          setTimeout(() => navigate('/'), 2500);
        } else {
          setStatus('error');
          setMessage(data.message);
        }
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to verify email. Please try again.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen pt-24 bg-[#0f0d0c] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="luxury-surface p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-10 h-10 border-2 border-charcoal-200 border-t-charcoal rounded-full animate-spin mx-auto mb-6" />
              <h2 className="font-serif text-2xl text-charcoal mb-2">Verifying your email...</h2>
              <p className="text-sm text-charcoal-500">Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl text-charcoal mb-2">Email Verified</h2>
              <p className="text-sm text-charcoal-500 mb-2">{message}</p>
              <p className="text-xs text-charcoal-400 mb-8">Redirecting you back to the site...</p>
              <Link
                to="/"
                className="inline-block bg-charcoal text-cream px-8 py-3 text-xs font-sans tracking-widest uppercase hover:bg-charcoal/90 transition-colors"
              >
                Go to Site
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl text-charcoal mb-2">Verification Failed</h2>
              <p className="text-sm text-charcoal-500 mb-8">{message}</p>
              <div className="space-y-3">
                <Link
                  to="/account"
                  className="block w-full bg-charcoal text-cream px-6 py-3 text-xs font-sans tracking-widest uppercase hover:bg-charcoal/90 transition-colors text-center"
                >
                  Go to Account
                </Link>
                <Link
                  to="/"
                  className="block w-full border border-charcoal text-charcoal px-6 py-3 text-xs font-sans tracking-widest uppercase hover:bg-charcoal hover:text-cream transition-all text-center"
                >
                  Back to Home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
