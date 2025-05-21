import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold">Privacy Policy – Rivu Inc.</h1>
        <p className="text-sm text-muted-foreground">Last Updated: May 19, 2025</p>

        <div className="prose dark:prose-invert max-w-none">
          <p>
            Rivu Inc. ("Rivu", "we", "our") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, and protect your personal information.
          </p>

          <p>
            We use Plaid Inc. to securely access your financial account information. 
            Rivu does not store your banking credentials. All connections to financial 
            institutions are handled securely through Plaid's encrypted interface.
          </p>

          <h2>Data We Collect</h2>
          <p>Data we may collect includes:</p>
          <ul>
            <li>Account balances and transactions</li>
            <li>Budget goals and activity logs</li>
            <li>Coaching feedback and performance</li>
          </ul>

          <p>
            We store your data using secure, encrypted infrastructure and never share it 
            with third parties without your explicit consent. You may request deletion of 
            your data at any time by emailing <a href="mailto:support@tryrivu.com">support@tryrivu.com</a>.
          </p>

          <p>
            View our full data rights policy, deletion procedure, and Plaid terms at: 
            <a href="https://plaid.com/legal" target="_blank" rel="noopener noreferrer">
              https://plaid.com/legal
            </a>
          </p>

          <h2>How We Use Your Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services. 
            This includes:
          </p>
          <ul>
            <li>Processing and analyzing your financial transactions</li>
            <li>Creating personalized budgets and financial insights</li>
            <li>Monitoring your progress toward financial goals</li>
            <li>Communicating with you about your account</li>
            <li>Improving our services and developing new features</li>
          </ul>

          <h2>Your Rights and Choices</h2>
          <p>
            You have certain rights regarding your personal information:
          </p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and associated data</li>
            <li>Export your data</li>
            <li>Opt-out of certain data collection</li>
          </ul>

          <h2>Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your 
            personal information against unauthorized or unlawful processing, accidental loss, 
            destruction, or damage.
          </p>

          <h2>Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any 
            changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at 
            <a href="mailto:support@tryrivu.com"> support@tryrivu.com</a>.
          </p>

          <hr className="my-8" />
          
          <div className="text-sm text-muted-foreground mt-8">
            <p>
              Rivu Inc. is a Delaware corporation. These terms are governed by the laws of the State of Delaware.
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