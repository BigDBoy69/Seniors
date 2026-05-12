import { Link } from 'react-router-dom'

export function TermsPage() {
  const lastUpdated = "January 2025"
  
  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        <div className="mb-12">
          <p className="text-2xs uppercase tracking-[0.4em] text-cream/45 mb-4">Legal</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream mb-4">Terms of Service</h1>
          <p className="text-cream/45 text-sm">Last Updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-invert max-w-none text-cream/70">
          <p className="lead text-cream/80 text-lg">
            Welcome to Akwaluzto. These Terms of Service govern your access to and use of our website, 
            products, and services. By accessing or using our website, you agree to be bound by these Terms.
            Please read them carefully.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">1. Account Registration</h2>
          <p>
            To access certain features of our website, including making purchases, you may need to create an account. 
            You agree to provide accurate, current, and complete information during registration and to update 
            such information to keep it accurate and complete.
          </p>
          <p className="mt-4">
            You are responsible for maintaining the confidentiality of your account credentials and for all 
            activities that occur under your account. You agree to notify us immediately of any unauthorized 
            use of your account or any other breach of security.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">2. Orders & Payment</h2>
          <p>
            All orders are subject to acceptance and availability. We reserve the right to cancel any order 
            for any reason, including but not limited to:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Product unavailability</li>
            <li>Errors in product pricing or description</li>
            <li>Payment authorization issues</li>
            <li>Suspected fraud or violation of these Terms</li>
          </ul>
          <p className="mt-6">
            Prices for our products are subject to change without notice. We reserve the right to modify 
            or discontinue any product without notice. Payment must be received prior to order processing. 
            We accept the payment methods listed on our checkout page.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">3. Shipping & Delivery</h2>
          <p>
            Shipping and delivery dates are estimates only. We are not responsible for delays caused by 
            circumstances beyond our control, including but not limited to carrier delays, customs processing, 
            weather conditions, or incorrect delivery information provided by you.
          </p>
          <p className="mt-4">
            Risk of loss and title for items purchased pass to you upon delivery of the items to the carrier. 
            You are responsible for filing any claims with carriers for damaged or lost shipments.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">4. Returns & Refunds</h2>
          <p>
            Our return policy allows for returns of full-priced items within 14 days of delivery, subject to 
            the conditions outlined in our Returns Policy. To be eligible for a return:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Items must be unworn, unwashed, and in original condition</li>
            <li>All original tags must be attached</li>
            <li>Items must be returned in original packaging</li>
            <li>Sale items marked as "Final Sale" are non-refundable</li>
          </ul>
          <p className="mt-6">
            Refunds will be issued to the original payment method within 5-7 business days after we receive 
            and inspect the returned items. Original shipping costs are non-refundable.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">5. Intellectual Property</h2>
          <p>
            All content on this website, including but not limited to text, graphics, logos, images, 
            product descriptions, and software, is the property of Akwaluzto or its content suppliers 
            and is protected by international copyright, trademark, and other intellectual property laws.
          </p>
          <p className="mt-4">
            You may not reproduce, distribute, modify, create derivative works of, publicly display, 
            publicly perform, republish, download, store, or transmit any of the material on our website 
            without our prior written consent.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">6. User Conduct</h2>
          <p>You agree not to use our website or services to:</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Violate any applicable law or regulation</li>
            <li>Engage in fraudulent activities or misrepresent your identity</li>
            <li>Attempt to gain unauthorized access to our systems or user accounts</li>
            <li>Interfere with the proper working of the website</li>
            <li>Harvest or collect personal information of other users</li>
            <li>Transmit any viruses, malware, or harmful code</li>
          </ul>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">7. Product Information</h2>
          <p>
            We make every effort to display our products accurately, including colors, descriptions, and 
            sizing. However, we do not guarantee that your device's display of any color will be accurate. 
            Product measurements may vary slightly due to manufacturing processes.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Akwaluzto shall not be liable for any indirect, incidental, 
            special, consequential, or punitive damages, including but not limited to loss of profits, 
            data, use, goodwill, or other intangible losses, resulting from:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Your access to or use of, or inability to access or use, our website or services</li>
            <li>Any conduct or content of any third party on our website</li>
            <li>Any content obtained from our website</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content</li>
          </ul>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">9. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Akwaluzto and its affiliates, licensors, 
            and service providers from and against any claims, liabilities, damages, judgments, awards, 
            losses, costs, expenses, or fees arising out of or relating to your violation of these Terms 
            or your use of the website.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">10. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of Lebanon, 
            without regard to its conflict of law provisions. Any legal action or proceeding arising 
            out of these Terms shall be brought exclusively in the courts of Lebanon.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">11. Changes to Terms</h2>
          <p>
            We may revise these Terms at any time by updating this page. Your continued use of our website 
            following the posting of revised Terms means that you accept and agree to the changes.
          </p>

          <h2 className="font-serif text-2xl text-cream mt-12 mb-4">12. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us:
          </p>
          <div className="mt-4 text-cream/80">
            <p>Email: legal@akwaluzto.com</p>
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
