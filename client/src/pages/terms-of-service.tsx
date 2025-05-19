import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <Button variant="outline" size="sm" asChild>
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Terms of Service – Rivu Inc.</h1>
        <p className="text-sm text-muted-foreground">Last Updated: May 19, 2025</p>

        <div className="prose dark:prose-invert max-w-none">
          <p>
            By creating an account with Rivu Inc., you agree to the following:
          </p>

          <ol>
            <li>
              <p>
                <strong>Educational Purposes Only:</strong> Rivu provides personal finance insights 
                for informational purposes only. Rivu is not a registered financial advisor and does 
                not provide investment, legal, or tax advice.
              </p>
            </li>
            
            <li>
              <p>
                <strong>Your Responsibility:</strong> You are responsible for your own financial 
                decisions. We recommend speaking with a licensed professional before taking 
                financial action.
              </p>
            </li>
            
            <li>
              <p>
                <strong>Age Requirement:</strong> You must be at least 18 years old to use this 
                service.
              </p>
            </li>
            
            <li>
              <p>
                <strong>Data Security:</strong> All financial data is handled securely using best 
                practices and encrypted storage.
              </p>
            </li>
            
            <li>
              <p>
                <strong>Account Deletion:</strong> You may request deletion of your account and data 
                by contacting <a href="mailto:support@tryrivu.com">support@tryrivu.com</a>.
              </p>
            </li>
            
            <li>
              <p>
                <strong>Terms Updates:</strong> We may update these terms periodically. Continued 
                use of Rivu means you accept the revised terms.
              </p>
            </li>
          </ol>

          <h2>Account Creation and Security</h2>
          <p>
            When you create an account with Rivu, you are responsible for:
          </p>
          <ul>
            <li>Providing accurate and complete information</li>
            <li>Maintaining the security of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
          </ul>

          <h2>Acceptable Use</h2>
          <p>
            You agree not to:
          </p>
          <ul>
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to any portion of the service</li>
            <li>Interfere with or disrupt the service or servers</li>
            <li>Scrape, data mine, or copy any content without permission</li>
            <li>Use the service to transmit harmful code or content</li>
          </ul>

          <h2>Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Rivu Inc. shall not be liable for any indirect, 
            incidental, special, consequential, or punitive damages resulting from your use of or 
            inability to use the service.
          </p>

          <h2>Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the service for any reason, 
            including violation of these Terms. Upon termination, your right to use the service will 
            immediately cease.
          </p>

          <h2>Governing Law</h2>
          <p>
            These Terms shall be governed by the laws of the State of California, without regard to 
            its conflict of law provisions.
          </p>

          <h2>Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at 
            <a href="mailto:support@tryrivu.com"> support@tryrivu.com</a>.
          </p>

          <hr className="my-8" />
          
          <div className="text-sm text-muted-foreground mt-8">
            <p>
              Rivu Inc. is a United States-based company headquartered in California. 
              By using Rivu, you consent to data processing in accordance with U.S. law. 
              All trademarks and logos belong to their respective owners. 
              For questions, email <a href="mailto:support@tryrivu.com">support@tryrivu.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}