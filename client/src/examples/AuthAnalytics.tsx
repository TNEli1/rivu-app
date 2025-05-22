// Example code showing how to use PostHog analytics for user authentication
import React, { useEffect, useState } from 'react';
import { useAnalytics } from '@/lib/AnalyticsContext';
import { useAuth } from '@/hooks/use-auth';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { identifyUser, resetIdentity } = useAnalytics();
  const { user } = useAuth();
  
  // Track authenticated user for better analytics
  useEffect(() => {
    if (user) {
      // Identify user in PostHog (without exposing sensitive data)
      identifyUser(user._id.toString(), {
        // Only tracking non-sensitive info for the user
        createdAt: user.createdAt
      });
    } else {
      // Reset identity when user logs out
      resetIdentity();
    }
  }, [user, identifyUser, resetIdentity]);
  
  return <>{children}</>;
}

// Example login component with analytics
export function LoginForm() {
  const { posthog } = useAnalytics();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Your existing login logic
      // const result = await loginUser(email, password);
      
      // Track successful login (without capturing sensitive data)
      posthog.capture('user_logged_in');
      
      // Continue with your login logic
      console.log('User logged in successfully');
    } catch (error: any) {
      // Track failed login (without capturing credentials)
      posthog.capture('login_failed', { 
        error: error.message
      });
      
      console.error('Login failed', error);
    }
  };
  
  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Log In
      </button>
    </form>
  );
}