import { Link } from "wouter";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using Rivu, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Eligibility</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>You must be at least 18 years of age</li>
                <li>You must be a U.S. resident</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for maintaining the security of your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Not a Financial Institution or Advisor</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  <strong>IMPORTANT DISCLAIMER:</strong> Rivu is not a bank or a Registered Investment Advisor.
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                Rivu is not a bank or a Registered Investment Advisor. Banking data is securely accessed using Plaid, a third-party data aggregator. Rivu provides educational and behavioral finance tools only — not investment, legal, or tax advice.
              </p>
              <p className="text-gray-700 mb-4">
                The information provided by Rivu is for educational and behavioral guidance purposes only. It does not constitute financial, investment, legal, or tax advice.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Rivu is not a Registered Investment Advisor (RIA)</li>
                <li>Rivu does not provide financial, legal, or tax advice</li>
                <li>All insights are educational and AI-generated</li>
                <li>Rivu is not liable for financial outcomes or API errors</li>
                <li>Use of Rivu constitutes agreement to these terms</li>
                <li>Use of Rivu does not create a fiduciary relationship</li>
                <li>All financial decisions remain your sole responsibility</li>
                <li>For personalized financial advice, consult a licensed financial advisor</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Service Description</h2>
              <p className="text-gray-700 mb-4">
                Rivu provides personal finance management tools including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Transaction tracking and categorization</li>
                <li>Budget management and monitoring</li>
                <li>Savings goal tracking</li>
                <li>AI-powered financial insights and recommendations</li>
                <li>Financial behavior analysis</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                Rivu relies on third-party APIs and services including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li><strong>Plaid</strong> - For secure bank account connectivity</li>
                <li><strong>OpenAI</strong> - For AI-powered financial insights</li>
                <li><strong>Postmark</strong> - For email communications</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Rivu is not liable for outages, inaccuracies, or issues with these third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Responsibilities</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Provide accurate and truthful information</li>
                <li>Keep your account credentials secure</li>
                <li>Use the service in compliance with applicable laws</li>
                <li>Do not attempt to reverse engineer or hack the platform</li>
                <li>Report any security vulnerabilities responsibly</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, Rivu shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-700">
                These terms are governed by the laws of the State of California, United States. Any disputes shall be resolved in the courts of California.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Account Termination</h2>
              <p className="text-gray-700">
                You may terminate your account at any time. We reserve the right to suspend or terminate accounts that violate these terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to Terms</h2>
              <p className="text-gray-700">
                We may update these terms from time to time. Continued use of the service constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-700">
                For questions about these Terms of Service, contact us at: <strong>legal@tryrivu.com</strong>
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