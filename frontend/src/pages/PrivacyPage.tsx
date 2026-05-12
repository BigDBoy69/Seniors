import { Link } from 'react-router-dom'

export function PrivacyPage() {
  const lastUpdated = "January 2025"
  
  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        <div className="mb-12">
          <p className="text-2xs uppercase tracking-[0.4em] text-cream/45 mb-4">Legal</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream mb-4">Privacy Policy</h1>
          <p className="text-cream/45 text-sm">Last Updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-invert max-w-none text-cream/70">
          <p className="lead text-cream/80 text-lg">
            At Akwaluzto, we respect your privacy and are committed to protecting your personal data. 
            This Privacy Policy explains how we collect, use, and safeguard your information when you 
            visit our website or make a purchase.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">Information We Collect</h2>
          <p>We collect information that you provide directly to us, including:</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Name, email address, phone number, and shipping/billing address when you create an account or place an order</li>
            <li>Payment information (processed securely through our payment providers; we do not store full credit card details)</li>
            <li>Communication preferences and correspondence with our customer service team</li>
            <li>Information you provide when subscribing to our newsletter or contacting us</li>
          </ul>
          
          <p className="mt-6">We also automatically collect certain information when you visit our website:</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>IP address, browser type, and device information</li>
            <li>Pages viewed, products browsed, and time spent on our site</li>
            <li>Referring website or source</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">How We Use Your Information</h2>
          <p>We use your personal information for the following purposes:</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Processing and fulfilling your orders, including shipping and delivery</li>
            <li>Communicating with you about your orders, account, or customer service inquiries</li>
            <li>Sending marketing communications (if you have opted in)</li>
            <li>Personalizing your shopping experience and product recommendations</li>
            <li>Improving our website, products, and services</li>
            <li>Preventing fraud and ensuring security</li>
            <li>Complying with legal obligations</li>
          </ul>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">Information Sharing</h2>
          <p>We do not sell your personal information. We share your data only with:</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Service providers who assist with order fulfillment, payment processing, shipping, and website operations</li>
            <li>Legal authorities when required by law or to protect our rights</li>
            <li>Business partners in the event of a merger, acquisition, or sale (with notice to you)</li>
          </ul>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">Your Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Access: Request a copy of the personal data we hold about you</li>
            <li>Correction: Update or correct inaccurate information</li>
            <li>Deletion: Request deletion of your personal data (subject to legal obligations)</li>
            <li>Opt-out: Unsubscribe from marketing communications at any time</li>
            <li>Data portability: Request transfer of your data to another service</li>
          </ul>
          <p className="mt-6">To exercise these rights, please contact us at privacy@akwaluzto.com.</p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal data 
            against unauthorized access, alteration, disclosure, or destruction. All payment information 
            is encrypted using SSL technology. However, no method of transmission over the Internet is 
            100% secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">Cookies</h2>
          <p>
            We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, 
            and understand where our visitors come from. You can control cookies through your browser settings. 
            Note that disabling cookies may affect certain features of our website.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">Children's Privacy</h2>
          <p>
            Our website is not intended for children under 16 years of age. We do not knowingly collect 
            personal information from children. If you are a parent or guardian and believe your child has 
            provided us with personal data, please contact us immediately.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page 
            with a revised "Last Updated" date. We encourage you to review this policy periodically.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="mt-4 text-cream/80">
            <p>Email: privacy@akwaluzto.com</p>
            <p>Address: Akwaluzto, Beirut, Lebanon</p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-cream/10 text-center">
          <Link to="/contact" className="text-cream/65 hover:text-cream transition-colors text-sm">
            Questions? Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}
