import { Card } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'white', color: 'black' }}>
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'black' }}>Terms of Service</h1>
          <p style={{ color: '#4a5568' }}>Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="p-8" style={{ backgroundColor: 'white', color: 'black' }}>
          <div className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Corporate Entity & Jurisdiction</h2>
              <p>
                Rivu Inc. is a Delaware C Corporation governed under the laws of the State of Delaware. 
                These Terms of Service constitute a legal agreement between you and Rivu Inc., a corporation 
                organized and existing under the laws of the State of Delaware, with its principal place of 
                business in the United States.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">2. Age Restriction & Eligibility</h2>
              <p>
                You must be at least 18 years of age and a U.S. resident to use Rivu. By accessing or using 
                our services, you represent and warrant that you meet these eligibility requirements. If you 
                do not meet these requirements, you may not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">3. Service Description & Disclaimers</h2>
              <p>
                <strong>Important Financial Disclaimer:</strong> Rivu is not a financial advisor, fiduciary, 
                or bank. All AI outputs and financial insights provided through our platform are for educational 
                purposes only and should not be considered as professional financial advice, investment 
                recommendations, or banking services.
              </p>
              <p>
                Bank connections are facilitated through Plaid Inc., a third-party service provider. 
                Rivu does not store your bank credentials or have direct access to your banking information. 
                All financial data connectivity is managed through Plaid's secure infrastructure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">4. Dispute Resolution & Arbitration</h2>
              <p>
                <strong>Binding Arbitration Agreement:</strong> Any dispute, claim, or controversy arising 
                out of or relating to these Terms or the breach, termination, enforcement, interpretation, 
                or validity thereof, including the determination of the scope or applicability of this 
                agreement to arbitrate, shall be determined by arbitration before the American Arbitration 
                Association (AAA) under its Commercial Arbitration Rules.
              </p>
              <p>
                <strong>Class Action Waiver:</strong> You agree that any arbitration or proceeding shall be 
                limited to the dispute between you and Rivu Inc. individually. You waive any right to 
                participate in any class action lawsuit or class-wide arbitration.
              </p>
              <p>
                <strong>Jury Trial Waiver:</strong> You and Rivu Inc. waive any constitutional and statutory 
                rights to go to court and have a trial in front of a judge or a jury.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. User Obligations & Consent</h2>
              <p>
                By creating an account, you acknowledge and agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You understand this application uses artificial intelligence and personal financial data for educational guidance only</li>
                <li>You have read, understood, and agree to be bound by these Terms of Service</li>
                <li>You have read and agree to our Privacy Policy</li>
                <li>You consent to the collection and processing of your personal and financial data as described in our Privacy Policy</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">6. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are and will remain the 
                exclusive property of Rivu Inc. and its licensors. The Service is protected by copyright, 
                trademark, and other laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
              <p>
                In no event shall Rivu Inc., nor its directors, employees, partners, agents, suppliers, 
                or affiliates, be liable for any indirect, incidental, special, consequential, or punitive 
                damages, including without limitation, loss of profits, data, use, goodwill, or other 
                intangible losses, resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">8. Termination</h2>
              <p>
                We may terminate or suspend your account and bar access to the Service immediately, without 
                prior notice or liability, under our sole discretion, for any reason whatsoever, including 
                without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">9. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                If a revision is material, we will provide at least 30 days notice prior to any new terms 
                taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">10. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p>
                <strong>Rivu Inc.</strong><br />
                Email: legal@tryrivu.com<br />
                Subject: Terms of Service Inquiry
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">11. Governing Law</h2>
              <p>
                These Terms shall be interpreted and governed by the laws of the State of Delaware, without 
                regard to conflict of law provisions. Our failure to enforce any right or provision of these 
                Terms will not be considered a waiver of those rights.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}