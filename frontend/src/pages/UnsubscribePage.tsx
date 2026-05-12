import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { request } from '@/lib/transport';

export function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link');
      return;
    }

    const unsubscribe = async () => {
      try {
        const data = await request<{ success: boolean; message: string }>(
          `/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
        );
        if (data.success) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.message);
        }
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to process unsubscribe request. Please try again.');
      }
    };

    unsubscribe();
  }, [token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing...</h2>
              <p className="text-gray-600">Please wait while we process your request.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unsubscribed Successfully</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <p className="text-sm text-gray-500 mb-6">
                You've been removed from our newsletter list. We're sorry to see you go!
              </p>
              <Link
                to="/"
                className="inline-block bg-gray-900 text-white px-6 py-3 rounded-md hover:bg-gray-800 transition"
              >
                Back to Home
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unsubscribe Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  to="/contact"
                  className="block w-full bg-gray-900 text-white px-6 py-3 rounded-md hover:bg-gray-800 transition text-center"
                >
                  Contact Support
                </Link>
                <Link
                  to="/"
                  className="block w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-50 transition text-center"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
