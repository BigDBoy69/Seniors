import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { getOrder, type Order } from '@/lib/api'
import { formatPrice, getStatusLabel } from '@/lib/utils'

export function OrderConfirmedPage() {
  const { id: routeId } = useParams()
  const [searchParams] = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(true)
  const shouldPollRef = useRef(true)

  // Resolve order ID — from route param OR from sessionStorage (PayMob redirect)
  const resolveOrderId = (): string | null => {
    if (routeId) return routeId
    const stored = sessionStorage.getItem('pendingOrderId')
    return stored ?? null
  }

  useEffect(() => {
    const orderId = resolveOrderId()
    if (!orderId) {
      setLoading(false)
      setPolling(false)
      return
    }

    // Resolve credentials once for the lifetime of this effect.
    // Prefer the auth token (logged-in user). Fall back to the phone number
    // stored by CheckoutPage for guest COD orders.
    const token = localStorage.getItem('akwaluzto_token')
    const phone = sessionStorage.getItem('order_phone')

    let attempts = 0
    const maxAttempts = 20 // poll up to ~100 seconds

    const fetchOrder = async () => {
      try {
        const result = await getOrder(orderId, { token, phone })
        setOrder(result)
        setLoading(false)

        const settled =
          result.paymentStatus === 'PAID' ||
          result.status === 'PAYMENT_FAILED' ||
          result.status === 'CANCELLED' ||
          result.paymentMethod === 'CASH_ON_DELIVERY'

        if (settled) {
          shouldPollRef.current = false
          setPolling(false)
          sessionStorage.removeItem('pendingOrderId')
          sessionStorage.removeItem('order_phone')
          return
        }

        attempts++
        if (attempts >= maxAttempts) {
          shouldPollRef.current = false
          setPolling(false)
        }
      } catch {
        setLoading(false)
        shouldPollRef.current = false
        setPolling(false)
      }
    }

    fetchOrder()
    const interval = setInterval(() => {
      if (!shouldPollRef.current) { clearInterval(interval); return }
      fetchOrder()
    }, 5000)

    return () => { shouldPollRef.current = false; clearInterval(interval) }
  }, [routeId])

  if (loading) {
    return (
      <div className="min-h-screen pt-20 bg-cream text-charcoal flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-charcoal mx-auto" />
          <p className="text-sm font-sans text-charcoal-400">Loading your order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen pt-20 bg-cream text-charcoal">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <p className="text-charcoal-400">Order not found.</p>
          <Link to="/shop" className="mt-4 inline-block text-xs uppercase tracking-widest border-b border-charcoal pb-px">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  const isCOD = order.paymentMethod === 'CASH_ON_DELIVERY'
  const isPaid = order.paymentStatus === 'PAID'
  const isFailed = order.status === 'PAYMENT_FAILED' || order.paymentStatus === 'FAILED'
  const isPending = !isPaid && !isFailed && !isCOD

  const StatusIcon = isFailed ? XCircle : isPending ? Clock : CheckCircle2
  const iconColor = isFailed ? 'text-red-400' : isPending ? 'text-amber-400' : 'text-taupe'

  return (
    <div className="min-h-screen pt-20 bg-cream text-charcoal">
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <StatusIcon size={56} className={`${iconColor} mx-auto mb-6`} />

          {isFailed ? (
            <>
              <h1 className="font-serif text-5xl mb-4">Payment Failed</h1>
              <p className="text-base font-sans text-charcoal-400 leading-relaxed">
                Your payment could not be processed. No charge was made.
              </p>
            </>
          ) : isPending ? (
            <>
              <h1 className="font-serif text-5xl mb-4">Confirming Payment</h1>
              <p className="text-base font-sans text-charcoal-400 leading-relaxed">
                We are verifying your payment. This usually takes a few seconds.
              </p>
              {polling && (
                <div className="flex justify-center mt-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-charcoal" />
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="font-serif text-5xl mb-4">Order Confirmed</h1>
              <p className="text-base font-sans text-charcoal-400 leading-relaxed">
                Thank you, <strong className="text-charcoal font-medium">{order.customerName}</strong>.
                {isPaid && ' Your payment was received.'}
                {isCOD && ' We will collect payment on delivery.'}
              </p>
            </>
          )}
        </div>

        <div className="bg-blush-light px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div>
            <p className="text-2xs font-sans tracking-widest uppercase text-charcoal-300 mb-1">Order Number</p>
            <p className="font-mono text-lg font-medium">{order.orderNumber}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-2xs font-sans tracking-widest uppercase text-charcoal-300 mb-1">Status</p>
            <p className="text-sm font-sans font-medium">{getStatusLabel(order.status)}</p>
          </div>
        </div>

        {isPaid && (
          <div className="bg-green-50 border border-green-200 px-5 py-4 mb-8 text-sm text-green-700 font-sans">
            Payment confirmed. Your order is being prepared.
          </div>
        )}

        {isFailed && (
          <div className="bg-red-50 border border-red-200 px-5 py-4 mb-8 text-sm text-red-700 font-sans">
            Your payment was declined. Please try again.
          </div>
        )}

        <div className="border-t border-charcoal-100 pt-4 flex justify-between mb-8">
          <span className="text-xs font-sans tracking-widest uppercase">Total</span>
          <span className="font-serif text-xl">{formatPrice(order.total)}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isFailed ? (
            <Link
              to="/checkout"
              className="bg-charcoal text-cream text-xs font-sans tracking-widest uppercase px-8 py-4 flex items-center justify-center hover:bg-charcoal-500 transition-colors"
            >
              Try Again
            </Link>
          ) : (
            <Link
              to="/shop"
              className="bg-charcoal text-cream text-xs font-sans tracking-widest uppercase px-8 py-4 flex items-center justify-center hover:bg-charcoal-500 transition-colors"
            >
              Continue Shopping
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
