import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCart } from '@/hooks/useCart'
import { useAuth, getAuthToken } from '@/hooks/useAuth'
import { createOrder } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  customerName: z.string().min(2, 'Please enter your full name'),
  customerEmail: z.union([z.string().email('Please enter a valid email'), z.literal('')]).optional(),
  phone: z.string().min(7, 'Please enter a valid phone number'),
  city: z.string().min(2, 'Please enter your city'),
  area: z.string().optional(),
  address: z.string().min(5, 'Please enter your full address'),
  notes: z.string().optional(),
  deliveryNotes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CheckoutPage() {
  const navigate = useNavigate()
  const { items, subtotal, clearCart } = useCart()
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerEmail: user?.email ?? '',
      customerName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '',
    },
  })

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="font-serif text-3xl">Your cart is empty</p>
        <Link to="/shop" className="text-2xs font-sans tracking-widest uppercase text-cream border-b border-cream/40 pb-px hover:text-cream/70 hover:border-cream/20 transition-colors">
          Back to Shop
        </Link>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setError(null)
    try {
      const token = user ? getAuthToken() : null
      const { orderId } = await createOrder({
        ...data,
        subtotal: subtotal(),
        total: subtotal(),
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.size,
          color: i.color,
        })),
      }, token)
      // Store phone so OrderConfirmedPage can verify guest access after redirect
      sessionStorage.setItem('order_phone', data.phone)
      clearCart()
      navigate(`/order-confirmed/${orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 pt-16 pb-24">
        <h1 className="font-serif text-5xl mb-12">Checkout</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 luxury-surface p-6 lg:p-8 flex flex-col gap-5">
            <Input label="Full Name" required error={errors.customerName?.message} {...register('customerName')} />
            <Input
              label="Email Address"
              type="email"
              placeholder={user?.email || 'your@email.com (optional but recommended)'}
              error={errors.customerEmail?.message}
              {...register('customerEmail')}
            />
            <Input label="Phone Number" required error={errors.phone?.message} {...register('phone')} />
            <Input label="City" required error={errors.city?.message} {...register('city')} />
            <Input label="Area / Neighbourhood" {...register('area')} />
            <Textarea label="Full Address" required error={errors.address?.message} {...register('address')} />
            <Textarea label="Delivery Instructions (Optional)" {...register('deliveryNotes')} />
            <Textarea label="Order Notes (Optional)" {...register('notes')} />
            {error && (
              <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm font-sans text-red-600">{error}</div>
            )}
          </div>
          <div className="bg-cream-100 p-6 h-fit sticky top-28 text-charcoal">
            <h2 className="font-serif text-xl mb-5">Order Review</h2>
            <div className="space-y-3 mb-5 border-b border-charcoal-100 pb-5">
              {items.map((item) => (
                <div key={item.variantId ?? item.productId} className="flex justify-between text-sm">
                  <span className="text-charcoal-500">
                    {item.name}{item.size ? ` (${item.size})` : ''} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-sans tracking-widest uppercase">Total</span>
              <span className="font-serif text-xl">{formatPrice(subtotal())}</span>
            </div>
            <p className="text-2xs text-charcoal-400 font-sans mb-6">Cash on Delivery</p>
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={submitting}>
              {submitting ? 'Placing Order...' : 'Place Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
