import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'white', color: 'black' }}>
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'black' }}>Privacy Policy</h1>
          <p style={{ color: '#4a5568' }}>Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="p-8" style={{ backgroundColor: 'white', color: 'black' }}>
          <div className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Corporate Entity & Data Controller</h2>
              <p>
                This Privacy Policy is provided by Rivu Inc., a Delaware C Corporation, which serves as the 
                data controller for all personal information collected through our services. We are committed 
                to protecting your privacy and complying with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Personal Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Name, email address, and account credentials</li>
                    <li>Financial goals, income bracket, and risk tolerance preferences</li>
                    <li>Usage data and interaction patterns with our AI systems</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Financial Data</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Transaction data from connected bank accounts (via Plaid)</li>
                    <li>Budget categories and spending patterns</li>
                    <li>Savings goals and financial objectives</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Technical Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Device information, IP address, and browser type</li>
                    <li>Log data and usage analytics</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide personalized financial insights and AI-powered coaching</li>
                <li>Analyze spending patterns and generate behavioral nudges</li>
                <li>Maintain and improve our services and user experience</li>
                <li>Comply with legal obligations and prevent fraud</li>
                <li>Communicate with you about your account and our services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">4. Third-Party Services & Data Sharing</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Plaid Integration</h3>
                  <p>
                    We use Plaid Inc. to connect to your bank accounts. <strong>Rivu does not store your 
                    bank credentials.</strong> All bank connections are secured through Plaid's industry-leading 
                    protocols. Please review Plaid's Privacy Policy for details on how they handle your data.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">AI Services</h3>
                  <p>
                    We use OpenAI's services to provide financial insights. Financial data sent to AI services 
                    is anonymized and used solely for generating personalized advice.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Limited Data Sharing</h3>
                  <p>We do not sell, rent, or trade your personal information. We may share data only:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>With service providers who assist in our operations (under strict confidentiality)</li>
                    <li>To comply with legal obligations or court orders</li>
                    <li>To protect our rights, property, or safety, or that of our users</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. Your Data Rights</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">California Consumer Privacy Act (CCPA/CPRA) Rights</h3>
                  <p>If you are a California resident, you have the right to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li><strong>Access:</strong> Request disclosure of personal information we collect, use, or share</li>
                    <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                    <li><strong>Opt-Out:</strong> Opt out of the sale of personal information (we do not sell data)</li>
                    <li><strong>Non-Discrimination:</strong> Not receive discriminatory treatment for exercising these rights</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">European Economic Area (EEA) - GDPR Rights</h3>
                  <p>If you are in the EEA, you have the right to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li><strong>Access:</strong> Obtain confirmation and access to your personal data</li>
                    <li><strong>Rectification:</strong> Correct inaccurate or incomplete personal data</li>
                    <li><strong>Erasure:</strong> Request deletion of your personal data ("right to be forgotten")</li>
                    <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                    <li><strong>Restriction:</strong> Restrict processing of your personal data in certain circumstances</li>
                    <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">New York SHIELD Act Compliance</h3>
                  <p>
                    We implement reasonable security practices and procedures to protect personal information 
                    from unauthorized access, use, modification, or disclosure, in accordance with the 
                    New York SHIELD Act requirements.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">6. Data Security & Protection</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All data is encrypted in transit using TLS/SSL protocols</li>
                <li>Personal information is encrypted at rest in our databases</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication measures for our systems</li>
                <li>Employee training on data protection and privacy practices</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
              <p>
                We retain your personal information only as long as necessary to provide our services, 
                comply with legal obligations, resolve disputes, and enforce our agreements. Upon account 
                deletion, we will delete or anonymize your personal data within 30 days, except where 
                longer retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country 
                of residence. We ensure appropriate safeguards are in place for international transfers, 
                including Standard Contractual Clauses approved by the European Commission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">9. Cookies & Tracking Technologies</h2>
              <p>
                We use essential cookies for authentication and functionality. We also use analytics cookies 
                to understand how you use our service. You can control cookie settings through your browser, 
                though disabling certain cookies may affect functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">10. Children's Privacy</h2>
              <p>
                Our service is not intended for individuals under 18 years of age. We do not knowingly 
                collect personal information from children under 18. If you become aware that a child 
                has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">11. How to Exercise Your Rights</h2>
              <p>
                To exercise any of your data rights or request data deletion, you can:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                <li>Use the "Delete My Data" feature in your account settings</li>
                <li>Email us at privacy@tryrivu.com with "Data Rights Request" as the subject</li>
                <li>Include your full name, email address, and specific request details</li>
              </ul>
              <p className="mt-2">
                We will respond to your request within 30 days as required by applicable privacy laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                For material changes, we will provide additional notice via email.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">13. Contact Information</h2>
              <p>
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-4">
                <p><strong>Rivu Inc.</strong></p>
                <p>Email: privacy@tryrivu.com</p>
                <p>Subject: Privacy Policy Inquiry</p>
                <p className="mt-2">
                  <strong>Data Protection Officer:</strong> legal@tryrivu.com
                </p>
              </div>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}