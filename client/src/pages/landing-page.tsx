import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, PieChart, Target, TrendingUp, BarChart2, Shield, FileSpreadsheet, Lock, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';

export default function LandingPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <img src="/images/rivu-logo.png" alt="Rivu Logo" className="h-32 w-auto" />
          </div>
          <div className="space-x-1 md:space-x-4">
            <Link href="/auth?redirect=/dashboard">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/auth?signup=true&redirect=/dashboard">
              <Button variant="default" size="sm">Sign up for free</Button>
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-10 md:py-20 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 md:pr-10">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
            Build better financial habits with Rivu
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-600 dark:text-gray-300">
            The AI-powered personal finance platform that understands your behavior and helps you achieve your financial goals.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <a href="/auth?signup=true&redirect=/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                Sign up for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="#features">
              <Button variant="outline" size="lg">
                See how it works
              </Button>
            </a>
          </div>
        </div>
        <div className="md:w-1/2 mt-10 md:mt-0 flex items-center justify-center">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 shadow-xl text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Smart. Simple. Secure.</h2>
            <p className="text-xl mb-2">Your journey to financial wellness starts here</p>
            <p className="text-lg italic mt-4">Take control of your finances with AI-powered insights</p>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className={`py-20 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">How Rivu helps you succeed</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow-md`}>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 mb-4">
                <BarChart2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Budgeting</h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Create personalized budgets that adapt to your spending habits and lifestyle, making it easier to stay on track.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow-md`}>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 mb-4">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Goal Tracking</h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Set and track your financial goals with real-time progress updates and smart recommendations to reach them faster.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow-md`}>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 mb-4">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Financial Coaching</h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Get personalized advice from our AI financial coach that learns from your habits and helps you make better decisions.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow-md`}>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-300 mb-4">
                <PieChart className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Rivu Score™</h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Track your financial health with our proprietary Rivu Score™ that measures and helps improve your overall financial wellbeing.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow-md`}>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-yellow-600 dark:text-yellow-300 mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Behavioral Insights</h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Understand your spending patterns with AI-powered insights that help you build positive financial habits.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Transaction Options Section */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-8">Seamless Transaction Tracking</h2>
          
          <div className="max-w-3xl mx-auto">
            <div className={`p-8 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow-lg`}>
              <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                <div className="md:w-1/4 flex justify-center">
                  <img 
                    src="/images/plaid-logo.png" 
                    alt="Plaid Logo" 
                    className="h-12 object-contain" 
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="md:w-3/4">
                  <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Rivu partners with Plaid, the trusted leader in financial connectivity, so you can securely link your bank and credit accounts. Prefer not to connect a bank? No problem — simply upload a CSV or add transactions manually to stay on track.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-50'} text-center`}>
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 mb-3">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium mb-2">Bank Connection</h3>
                  <p className="text-sm">Securely connect your accounts</p>
                </div>
                
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-50'} text-center`}>
                  <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 mb-3">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium mb-2">CSV Upload</h3>
                  <p className="text-sm">Import transactions from any source</p>
                </div>
                
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-50'} text-center`}>
                  <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 mb-3">
                    <Edit3 className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium mb-2">Manual Entry</h3>
                  <p className="text-sm">Add transactions as you go</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">What our users say</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} shadow-md`}>
              <p className={`text-lg italic mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                "Rivu helped me save for my first home down payment by making it easy to track my spending and set realistic goals."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">J</div>
                <div className="ml-3">
                  <p className="font-semibold">Jessica M.</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Home owner</p>
                </div>
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} shadow-md`}>
              <p className={`text-lg italic mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                "The AI coach recommendations have been a game-changer for me. I've paid off $12,000 in debt in just 8 months!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">M</div>
                <div className="ml-3">
                  <p className="font-semibold">Michael T.</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Software developer</p>
                </div>
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} shadow-md`}>
              <p className={`text-lg italic mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                "I love how Rivu adapts to my spending habits. It's the first budgeting app I've actually stuck with for more than a month!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">S</div>
                <div className="ml-3">
                  <p className="font-semibold">Sarah K.</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Small business owner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* iOS Waitlist Section */}
      <section className={`py-20 ${theme === 'dark' ? 'bg-gradient-to-r from-purple-900 to-blue-900' : 'bg-gradient-to-r from-purple-600 to-blue-600'} text-white`}>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">📱 iOS App Coming Soon!</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Be the first to experience Rivu on your iPhone. Join our exclusive early access list and get notified when the iOS app launches.
          </p>
          
          <div className="max-w-md mx-auto">
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = formData.get('email') as string;
                const name = formData.get('name') as string;
                
                try {
                  const response = await fetch('/api/ios-waitlist', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, name }),
                  });
                  
                  if (response.ok) {
                    alert("Thanks! We'll notify you when the iOS app is ready.");
                    e.currentTarget.reset();
                  } else {
                    throw new Error('Failed to join waitlist');
                  }
                } catch (error) {
                  alert('Something went wrong. Please try again.');
                }
              }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  name="name"
                  placeholder="Your name (optional)"
                  className="flex-1 px-4 py-3 rounded-lg text-gray-900 bg-white/90 focus:bg-white outline-none focus:ring-2 focus:ring-white/50"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your email address"
                  required
                  className="flex-1 px-4 py-3 rounded-lg text-gray-900 bg-white/90 focus:bg-white outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <Button 
                type="submit"
                size="lg" 
                className="w-full bg-white text-purple-600 hover:bg-gray-100 font-semibold"
              >
                Join iOS Early Access
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
          
          <p className="text-sm mt-4 opacity-75">
            Currently supports U.S. bank accounts only via Plaid.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to improve your financial habits?</h2>
          <p className={`text-xl mb-8 max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Join thousands of users who are building better financial futures with Rivu's behavior-based approach.
          </p>
          <a href="/auth?signup=true&redirect=/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              Sign up for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>
      
      {/* Footer */}
      <footer className={`py-10 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <img src="/images/rivu-logo.png" alt="Rivu Logo" className="h-24 w-auto" />
            </div>
            <div className="flex space-x-6">
              <a href="/privacy">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}>Privacy</span>
              </a>
              <a href="/terms">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}>Terms</span>
              </a>
              <a href="mailto:support@tryrivu.com" className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}>
                Contact
              </a>
            </div>
          </div>
          <div className={`text-center mt-8 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} space-y-2`}>
            <p className="text-xs max-w-4xl mx-auto">
              Rivu is not a bank or a Registered Investment Advisor. Banking data is securely accessed using Plaid, a third-party data aggregator. Rivu provides educational and behavioral finance tools only — not investment, legal, or tax advice.
            </p>
            <p className="text-xs">
              Currently supports U.S. bank accounts only via Plaid. iOS app coming soon — sign up to get early access.
            </p>
            <p>&copy; {new Date().getFullYear()} Rivu Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}