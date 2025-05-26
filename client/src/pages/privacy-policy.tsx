import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 mb-4">
                Rivu ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our personal finance platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Personal Information</h3>
                  <p className="text-gray-700">
                    We collect information you provide directly, including name, email address, and account credentials.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Financial Data</h3>
                  <p className="text-gray-700">
                    We use Plaid to connect U.S.-based financial accounts only. This includes transaction data, account balances, and institution information necessary for our services.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Provide personalized financial analysis and insights</li>
                <li>Generate AI-powered recommendations for your financial goals</li>
                <li>Maintain and improve our services</li>
                <li>Communicate with you about your account and our services</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Sharing</h2>
              <p className="text-gray-700 mb-4">
                <strong>We do not sell or share your personal data with third parties.</strong> Your financial information is used solely for providing personalized financial analysis within our platform.
              </p>
              <p className="text-gray-700">
                We may share information only in the following limited circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                <li>With service providers who assist in operating our platform (Plaid, OpenAI, Postmark)</li>
                <li>When required by law or to protect our rights</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-700 mb-4">
                All data is encrypted in transit and at rest. We implement industry-standard security measures to protect your information. Sessions are stored securely, and data is never shared without your consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Close your account at any time</li>
                <li>Withdraw consent for data processing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="text-gray-700">
                Our platform integrates with trusted third-party services including Plaid (for bank connectivity), OpenAI (for financial insights), and Postmark (for email communications). Each service has its own privacy policy governing their data practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at: <strong>privacy@tryrivu.com</strong>
              </p>
            </section>
          </div>

          <div className="text-center mt-8 pt-8 border-t border-gray-200">
            <Link href="/auth" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Rivu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}