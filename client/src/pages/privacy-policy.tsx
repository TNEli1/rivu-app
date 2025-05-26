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
                RIVU Inc., a Delaware C Corporation ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our personal finance platform.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-medium">
                  <strong>U.S. Only:</strong> Rivu currently supports U.S.-based bank accounts only via Plaid integration.
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  <strong>Financial Disclaimer:</strong> This is not financial advice. Rivu is not a bank or financial advisor. Banking data is securely accessed via Plaid, a third-party API provider.
                </p>
              </div>
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention & Consent</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-medium">
                  <strong>DATA RETENTION:</strong> Data is retained only as long as necessary and encrypted at rest. Users may request deletion at any time.
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                All data is encrypted at rest and stored in Railway-hosted PostgreSQL infrastructure located in the United States. Data is processed solely for app functionality and personalized insights. We do not sell user data.
              </p>
              <p className="text-gray-700 mb-4">
                All data transmission is encrypted using industry-standard security measures. Sessions are stored securely, and data is never shared without your consent.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Data Retention Policy:</strong> We retain your personal information only for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your data at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">GDPR Readiness</h2>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <p className="text-purple-800 font-medium">
                  <strong>EEA USERS:</strong> EEA users have the right to access, rectify, or delete their personal data under GDPR.
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                If you are located in the European Economic Area (EEA), you have the following rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Right of Access:</strong> You have the right to request copies of your personal data</li>
                <li><strong>Right to Rectification:</strong> You have the right to request correction of inaccurate personal data</li>
                <li><strong>Right to Erasure:</strong> You have the right to request deletion of your personal data</li>
                <li><strong>Right to Restrict Processing:</strong> You have the right to request restriction of processing</li>
                <li><strong>Right to Data Portability:</strong> You have the right to receive your data in a structured format</li>
                <li><strong>Right to Object:</strong> You have the right to object to our processing of your personal data</li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, contact us at <strong>privacy@tryrivu.com</strong> with "GDPR Request" in the subject line.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">CCPA/CPRA Compliance</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">
                  <strong>CALIFORNIA RESIDENTS:</strong> California residents may opt out of data sharing and request deletion under the CCPA and CPRA. Rivu does not sell user data.
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                If you are a California resident, the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA) provide you with specific rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Right to Know:</strong> You have the right to request information about personal data we collect, use, disclose, and sell</li>
                <li><strong>Right to Delete:</strong> You have the right to request deletion of personal information we have collected</li>
                <li><strong>Right to Opt-Out:</strong> You have the right to opt out of the sale of your personal information</li>
                <li><strong>Right to Non-Discrimination:</strong> You have the right not to receive discriminatory treatment for exercising your privacy rights</li>
                <li><strong>Right to Correct:</strong> You have the right to request correction of inaccurate personal information</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>Important:</strong> Rivu does not sell, rent, or share personal information with third parties for monetary or other valuable consideration.
              </p>
              <p className="text-gray-700 mt-4">
                To exercise your California privacy rights, contact us at <strong>privacy@tryrivu.com</strong> with "CCPA Request" in the subject line.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">New York SHIELD Act</h2>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                <p className="text-indigo-800 font-medium">
                  <strong>DATA PROTECTION:</strong> Rivu maintains reasonable data protection protocols in accordance with the New York SHIELD Act.
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                In compliance with the New York Stop Hacks and Improve Electronic Data Security (SHIELD) Act, we implement and maintain reasonable security measures to protect private information, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Encryption of personal information at rest and in transit</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and monitoring</li>
                <li>Employee training on data security practices</li>
                <li>Incident response procedures for data breaches</li>
                <li>Vendor management and third-party security requirements</li>
              </ul>
              <p className="text-gray-700 mt-4">
                In the event of a data breach affecting New York residents, we will provide notification in accordance with SHIELD Act requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights & Data Deletion</h2>
              <p className="text-gray-700 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Close your account at any time</li>
                <li>Withdraw consent for data processing</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium mb-2">
                  <strong>Data Deletion:</strong>
                </p>
                <p className="text-red-700">
                  You may request permanent deletion of your data at any time by emailing support@tryrivu.com or using the in-app "Delete My Data" feature in your account settings.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="text-gray-700">
                Our platform integrates with trusted third-party services including Plaid (for bank connectivity), OpenAI (for financial insights), and Postmark (for email communications). Each service has its own privacy policy governing their data practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-4">
                You have the following rights regarding your personal data:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Withdraw consent for data processing</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  <strong>Delete My Data:</strong> To request complete deletion of your account and all associated data, contact us at privacy@tryrivu.com with "Data Deletion Request" in the subject line.
                </p>
              </div>
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