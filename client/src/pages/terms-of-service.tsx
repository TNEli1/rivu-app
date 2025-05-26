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
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Financial Advice</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  <strong>IMPORTANT DISCLAIMER:</strong> Rivu does not offer financial, investment, tax, or legal advice. All information is provided for educational purposes only.
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                Rivu Inc. is not a bank, Registered Investment Advisor (RIA), or financial institution. Banking data is securely accessed using Plaid, a third-party data aggregator. Rivu provides educational and behavioral finance tools only — not investment, legal, or tax advice.
              </p>
              <p className="text-gray-700 mb-4">
                The information, insights, and recommendations provided by Rivu are for educational and behavioral guidance purposes only and do not constitute financial, investment, legal, or tax advice.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Rivu is not a Registered Investment Advisor (RIA) or financial institution</li>
                <li>Rivu does not provide financial, investment, legal, or tax advice</li>
                <li>All insights are educational, AI-generated, and for informational purposes only</li>
                <li>Rivu is not liable for financial outcomes, investment losses, or API errors</li>
                <li>Use of Rivu does not create a fiduciary, advisory, or professional relationship</li>
                <li>All financial decisions remain your sole responsibility and risk</li>
                <li>For personalized financial advice, consult a licensed financial advisor</li>
                <li>Past performance does not guarantee future results</li>
                <li>Investment and financial decisions carry inherent risks</li>
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Disclaimer</h2>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-orange-800 font-medium">
                  <strong>THIRD-PARTY SERVICES:</strong> Rivu integrates with Plaid, OpenAI, and Postmark. We disclaim liability for third-party services or outages.
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                Rivu relies on third-party APIs and services to provide our platform functionality:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Plaid Technologies, Inc.</strong> - For secure bank account connectivity and financial data aggregation</li>
                <li><strong>OpenAI</strong> - For AI-powered financial insights and natural language processing</li>
                <li><strong>Postmark (Wildbit, LLC)</strong> - For transactional email communications and notifications</li>
              </ul>
              <p className="text-gray-700 mt-4 mb-4">
                <strong>Disclaimer of Third-Party Liability:</strong> Rivu Inc. disclaims all liability for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Service outages, downtime, or interruptions from third-party providers</li>
                <li>Data inaccuracies, delays, or errors from external APIs</li>
                <li>Security breaches or data incidents at third-party services</li>
                <li>Changes to third-party terms of service or pricing</li>
                <li>Loss of functionality due to third-party service modifications</li>
                <li>Any damages arising from third-party service failures or limitations</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Users acknowledge that Rivu's functionality depends on these external services and accept the inherent risks of third-party integrations.
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Corporate Jurisdiction</h2>
              <p className="text-gray-700 mb-4">
                Rivu Inc. is a Delaware C Corporation governed by the laws of the State of Delaware. These services are provided by Rivu Inc. and all corporate matters are subject to Delaware state law and jurisdiction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Financial Disclaimers</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  <strong>Important:</strong> This is not financial advice. Rivu provides educational insights and analysis tools but is not a bank, financial advisor, or investment service.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-medium">
                  <strong>Banking Integration:</strong> Banking data is securely accessed via Plaid, a third-party API provider. Rivu currently supports U.S. bank accounts only.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Dispute Resolution</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-medium">
                  <strong>MANDATORY ARBITRATION:</strong> All disputes shall be resolved by binding arbitration administered by the American Arbitration Association (AAA). Users waive the right to a jury trial and to participate in any class action.
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                Any dispute, claim or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation or validity thereof, including the determination of the scope or applicability of this agreement to arbitrate, shall be determined by arbitration before one arbitrator.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>The arbitration shall be administered by the American Arbitration Association (AAA)</li>
                <li>You waive your right to a jury trial</li>
                <li>You waive your right to participate in a class action lawsuit</li>
                <li>The arbitrator's decision shall be final and binding</li>
                <li>Each party shall bear their own costs and attorney's fees</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-700">
                These terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.
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