import posthog from 'posthog-js';

// Initialize PostHog with the public key 
// (Safe to be in the client code as it's a public key)
const initPostHog = (): void => {
  if (typeof window !== 'undefined') {
    // Only initialize in the browser
    const apiKey = import.meta.env.VITE_POSTHOG_API_KEY as string;
    const apiHost = import.meta.env.VITE_POSTHOG_HOST as string || 'https://app.posthog.com';

    if (apiKey) {
      posthog.init(apiKey, {
        api_host: apiHost,
        // Enable debug mode in non-production
        debug: import.meta.env.DEV,
        // Disable capturing by default in development
        capture_pageview: !import.meta.env.DEV,
        // Privacy-friendly defaults
        capture_pageleave: false,
        disable_session_recording: true,
        // Respect Do Not Track setting
        respect_dnt: true,
        // Disable autocapture of form data for sensitive financial data
        autocapture: false,
        property_blacklist: [
          'password', 'email', 'phone', 'name', 'firstName', 'lastName', 
          'amount', 'balance', 'account', 'cardNumber', 'cvv', 'ssn', 
          'address', 'transaction', 'income', 'spending'
        ]
      });

      console.log('PostHog initialized');
    } else {
      console.warn('PostHog API key not found, analytics disabled');
    }
  }
};

const captureEvent = (eventName: string, properties?: Record<string, any>): void => {
  // Only log events in production or when explicitly enabled
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
    // Sanitize sensitive data before capturing
    if (properties) {
      const sanitizedProps = { ...properties };
      const sensitiveKeys = [
        'password', 'email', 'phone', 'name', 'firstName', 'lastName', 
        'amount', 'balance', 'account', 'cardNumber', 'cvv', 'ssn', 
        'address', 'transaction', 'income', 'spending'
      ];
      
      sensitiveKeys.forEach(key => {
        if (key in sanitizedProps) {
          sanitizedProps[key] = '[REDACTED]';
        }
      });
      
      posthog.capture(eventName, sanitizedProps);
    } else {
      posthog.capture(eventName);
    }
  }
};

export { initPostHog, captureEvent };