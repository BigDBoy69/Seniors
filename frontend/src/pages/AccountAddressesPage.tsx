import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getAddresses, createAddress, updateAddress, deleteAddress, type Address } from '@/lib/api'
import { getAuthToken } from '@/hooks/useAuth'
import { Plus, MapPin, Trash2, Check } from 'lucide-react'

export function AccountAddressesPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Address | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    const loadAddresses = async () => {
      const token = getAuthToken()
      if (!token) return
      try {
        const { addresses } = await getAddresses(token)
        setAddresses(addresses)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    if (isAuthenticated) {
      loadAddresses()
    }
  }, [isAuthenticated])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const token = getAuthToken()
    if (!token) return

    const form = e.currentTarget
    const fd = new FormData(form)

    const data = {
      firstName: (fd.get('firstName') as string) || null,
      lastName: (fd.get('lastName') as string) || null,
      line1: fd.get('line1') as string,
      line2: (fd.get('line2') as string) || null,
      city: fd.get('city') as string,
      state: (fd.get('state') as string) || null,
      postalCode: (fd.get('postalCode') as string) || null,
      country: (fd.get('country') as string) || 'Lebanon',
      phone: (fd.get('phone') as string) || null,
      isDefaultShipping: fd.get('isDefaultShipping') === 'on',
      isDefaultBilling: fd.get('isDefaultBilling') === 'on',
    }

    try {
      if (editing) {
        await updateAddress(token, editing.id, data)
      } else {
        await createAddress(token, data)
      }
      const { addresses: updated } = await getAddresses(token)
      setAddresses(updated)
      setEditing(null)
      setIsAdding(false)
    } catch {
      // ignore error
    }
  }

  const handleDelete = async (id: string) => {
    const token = getAuthToken()
    if (!token) return
    try {
      await deleteAddress(token, id)
      setAddresses(addresses.filter((a) => a.id !== id))
    } catch {
      // ignore
    }
  }

  if (isLoading || loading) {
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

  const formFields = editing || isAdding ? (
    <form onSubmit={handleSave} className="space-y-4 max-w-md">
      <div className="grid grid-cols-2 gap-4">
        <input name="firstName" defaultValue={editing?.firstName || ''} placeholder="First Name" className="border-b border-charcoal-200 bg-transparent py-2 text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
        <input name="lastName" defaultValue={editing?.lastName || ''} placeholder="Last Name" className="border-b border-charcoal-200 bg-transparent py-2 text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
      </div>
      <input name="line1" defaultValue={editing?.line1 || ''} placeholder="Address Line 1 *" required className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
      <input name="line2" defaultValue={editing?.line2 || ''} placeholder="Address Line 2" className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
      <div className="grid grid-cols-2 gap-4">
        <input name="city" defaultValue={editing?.city || ''} placeholder="City *" required className="border-b border-charcoal-200 bg-transparent py-2 text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
        <input name="state" defaultValue={editing?.state || ''} placeholder="State/Region" className="border-b border-charcoal-200 bg-transparent py-2 text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input name="postalCode" defaultValue={editing?.postalCode || ''} placeholder="Postal Code" className="border-b border-charcoal-200 bg-transparent py-2 text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
        <input name="country" defaultValue={editing?.country || 'Lebanon'} placeholder="Country" className="border-b border-charcoal-200 bg-transparent py-2 text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
      </div>
      <input name="phone" defaultValue={editing?.phone || ''} placeholder="Phone" className="w-full border-b border-charcoal-200 bg-transparent py-2 text-charcoal placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal" />
      <div className="flex gap-4 pt-2">
        <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
          <input type="checkbox" name="isDefaultShipping" defaultChecked={editing?.isDefaultShipping} className="accent-charcoal" />
          Default Shipping
        </label>
        <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
          <input type="checkbox" name="isDefaultBilling" defaultChecked={editing?.isDefaultBilling} className="accent-charcoal" />
          Default Billing
        </label>
      </div>
      <div className="flex gap-4 pt-4">
        <button type="submit" className="bg-charcoal text-cream px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-charcoal/90 transition-colors">
          Save Address
        </button>
        <button
          type="button"
          onClick={() => { setEditing(null); setIsAdding(false) }}
          className="border border-charcoal text-charcoal px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-charcoal hover:text-cream transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  ) : null

  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-12">
        <div className="mb-10">
          <p className="text-2xs uppercase tracking-[0.3em] text-cream/50 mb-3">Account</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream">Addresses</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-16">
          <aside className="space-y-2">
            <Link to="/account" className="block text-sm text-cream/70 hover:text-cream py-2 transition-colors">
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
            <Link to="/account/addresses" className="block text-sm text-cream py-2 border-b border-cream/20">
              Addresses
            </Link>
          </aside>

          <div className="lg:col-span-3 space-y-6">
            {!isAdding && !editing && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 text-cream/70 hover:text-cream transition-colors"
              >
                <Plus size={18} />
                <span className="text-sm">Add New Address</span>
              </button>
            )}

            {(isAdding || editing) && (
              <div className="luxury-surface p-6 lg:p-8">
                <h3 className="font-serif text-xl text-charcoal mb-4">{editing ? 'Edit Address' : 'New Address'}</h3>
                {formFields}
              </div>
            )}

            {addresses.map((address) => (
              <div key={address.id} className="luxury-surface p-6 lg:p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-charcoal-400 mt-1" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-serif text-charcoal">
                          {address.firstName || ''} {address.lastName || ''}
                        </span>
                        {address.isDefaultShipping && (
                          <span className="text-2xs uppercase tracking-wider px-2 py-0.5 bg-charcoal-100 text-charcoal">Default Shipping</span>
                        )}
                        {address.isDefaultBilling && (
                          <span className="text-2xs uppercase tracking-wider px-2 py-0.5 bg-charcoal-100 text-charcoal">Default Billing</span>
                        )}
                      </div>
                      <p className="text-sm text-charcoal-400">{address.line1}</p>
                      {address.line2 && <p className="text-sm text-charcoal-400">{address.line2}</p>}
                      <p className="text-sm text-charcoal-400">
                        {address.city}{address.state ? `, ${address.state}` : ''} {address.postalCode || ''}
                      </p>
                      <p className="text-sm text-charcoal-400">{address.country}</p>
                      {address.phone && <p className="text-sm text-charcoal-400 mt-1">{address.phone}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(address)}
                      className="p-2 text-charcoal-400 hover:text-charcoal transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="p-2 text-charcoal-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
