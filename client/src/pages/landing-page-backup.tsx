// Simple working iOS waitlist form
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function WaitlistForm() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    
    try {
      const response = await fetch('/api/ios-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      
      if (response.ok) {
        setMessage("✅ Thanks! We'll notify you when the iOS app is ready.");
        e.currentTarget.reset();
      } else {
        setMessage("❌ Failed to join waitlist. Please try again.");
      }
    } catch (error) {
      setMessage("❌ Something went wrong. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
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
          disabled={isLoading}
        >
          {isLoading ? 'Joining...' : 'Join iOS Early Access'}
        </Button>
        {message && (
          <div className={`mt-4 p-4 rounded-lg text-center ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}