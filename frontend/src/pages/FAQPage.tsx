import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqCategories = [
  {
    title: 'Orders & Payment',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We currently accept Cash on Delivery (COD) for all orders within Lebanon. Payment is collected at the time of delivery — no card details are required to place an order.'
      },
      {
        question: 'How do I track my order?',
        answer: 'Once your order ships, you will receive an email with tracking information. You can also view order status in your account under "My Orders". Orders typically ship within 1-2 business days.'
      },
      {
        question: 'Can I modify or cancel my order?',
        answer: 'Orders can be modified within 2 hours of placement. Please contact our customer service team immediately. Once an order has been processed for shipment, we cannot make changes.'
      }
    ]
  },
  {
    title: 'Shipping & Delivery',
    items: [
      {
        question: 'What are the shipping options?',
        answer: 'We offer Standard Shipping (3-5 business days), Express Shipping (1-2 business days), and Same-Day Delivery within Beirut for orders placed before 12 PM. International shipping typically takes 5-10 business days.'
      },
      {
        question: 'Do you ship internationally?',
        answer: 'Yes, we ship worldwide. International orders may be subject to import duties and taxes, which are the responsibility of the recipient. We recommend checking with your local customs office for specific information.'
      },
      {
        question: 'Is there free shipping?',
        answer: 'Complimentary standard shipping is available on all orders over $250 within Lebanon and over $500 internationally. Otherwise, shipping rates are calculated at checkout based on destination and package weight.'
      }
    ]
  },
  {
    title: 'Returns & Exchanges',
    items: [
      {
        question: 'What is your return policy?',
        answer: 'We accept returns within 14 days of delivery for full-priced items. Items must be unworn, unwashed, with original tags attached, and in original packaging. Sale items are final sale and cannot be returned.'
      },
      {
        question: 'How do I initiate a return?',
        answer: 'Log into your account, navigate to "My Orders", select the order and items you wish to return, and follow the return instructions. Alternatively, contact our customer service team for assistance.'
      },
      {
        question: 'When will I receive my refund?',
        answer: 'Refunds are processed within 5-7 business days after we receive and inspect your return. The refund will be issued to the original payment method. Please note that shipping costs are non-refundable.'
      }
    ]
  },
  {
    title: 'Products & Sizing',
    items: [
      {
        question: 'How do I find my size?',
        answer: 'Each product page includes a detailed size guide with measurements. We recommend comparing these measurements to a similar garment you already own. For personalized assistance, contact our styling team.'
      },
      {
        question: 'Are your materials sustainable?',
        answer: 'We prioritize sustainable practices wherever possible. Our collections use organic cotton, recycled fabrics, and deadstock materials. Each product description includes information about the fabric composition and origin.'
      },
      {
        question: 'How do I care for my garments?',
        answer: 'Care instructions are listed on the product page and garment label. We generally recommend gentle washing in cold water, air drying, and minimal ironing to preserve the fabric quality and longevity.'
      }
    ]
  }
]

export function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-2xs uppercase tracking-[0.4em] text-cream/45 mb-4">Support</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream mb-6">Frequently Asked Questions</h1>
          <p className="text-cream/65">
            Find answers to common questions about orders, shipping, returns, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {faqCategories.map((category, catIndex) => (
            <div key={catIndex} className="space-y-4">
              <h2 className="font-serif text-2xl text-cream mb-6">{category.title}</h2>
              {category.items.map((item, itemIndex) => {
                const id = `${catIndex}-${itemIndex}`
                const isOpen = openItems[id]
                
                return (
                  <div key={itemIndex} className="border border-cream/10 bg-[#151210]">
                    <button
                      onClick={() => toggleItem(id)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <span className="text-cream pr-4">{item.question}</span>
                      <ChevronDown 
                        className={`w-5 h-5 text-cream/45 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div 
                      className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}
                    >
                      <p className="px-5 pb-5 text-cream/65 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-cream/65 mb-4">Still have questions?</p>
          <a href="/contact" className="inline-flex items-center bg-cream text-charcoal text-xs font-sans tracking-[0.2em] uppercase px-10 py-4 hover:bg-cream/90 transition-colors">
            Contact Us
          </a>
        </div>
      </div>
    </div>
  )
}
