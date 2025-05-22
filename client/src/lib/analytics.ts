import posthog from 'posthog-js';

/**
 * Initialize PostHog analytics with the configuration needed for a financial application
 * 
 * @param apiKey - The PostHog API key
 * @returns - Whether initialization was successful
 */
export function initializeAnalytics(apiKey: string): boolean {
  // Try to use the provided key first, then fall back to env variable if needed
  const posthogKey = apiKey || import.meta.env.VITE_POSTHOG_API_KEY;
  
  if (!posthogKey) {
    console.warn('PostHog API key is missing. Analytics will not be tracked.');
    return false;
  }

  try {
    // Configure PostHog with privacy-first settings for a financial app
    posthog.init(posthogKey, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      mask_all_text: true, // Mask all text inputs for privacy protection
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: true,
          number: true,
          search: true
        }
      },
      // Prevent tracking sensitive financial data
      property_blacklist: [
        'password',
        'pass',
        'secret',
        'token',
        'auth',
        'access',
        'social_security',
        'ssn',
        'account',
        'credit_card',
        'routing',
        'income',
        'salary'
      ]
    });

    // Add additional privacy protection
    posthog.register({
      app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE
    });

    console.log('PostHog analytics initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize PostHog:', error);
    return false;
  }
}

/**
 * Track key application events related to financial management
 */
export const trackingEvents = {
  // Authentication events
  LOGIN: 'user_login',
  SIGNUP: 'user_signup',
  LOGOUT: 'user_logout',
  PROFILE_UPDATE: 'profile_updated',
  
  // Financial account events
  BANK_CONNECTED: 'bank_connected',
  BANK_DISCONNECTED: 'bank_disconnected',
  
  // Transaction events
  TRANSACTION_ADDED: 'transaction_added',
  TRANSACTION_IMPORTED: 'transactions_imported',
  TRANSACTION_CATEGORIZED: 'transaction_categorized',
  
  // Budget events
  BUDGET_CREATED: 'budget_created',
  BUDGET_UPDATED: 'budget_updated',
  
  // Goals events
  GOAL_CREATED: 'goal_created',
  GOAL_UPDATED: 'goal_updated',
  GOAL_COMPLETED: 'goal_completed',
  
  // Insights and advice
  INSIGHTS_VIEWED: 'insights_viewed',
  ADVICE_REQUESTED: 'advice_requested',
  
  // Notification events
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_CLICKED: 'notification_clicked'
};

/**
 * Track a page view with safe parameters
 */
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  posthog.capture('$pageview', {
    page_name: pageName,
    ...properties
  });
}

/**
 * Identify a user in analytics
 * Only pass non-sensitive user data
 */
export function identifyUser(userId: string, safeUserProps: Record<string, any> = {}) {
  posthog.identify(userId, safeUserProps);
}

/**
 * Reset user identity (used on logout)
 */
export function resetIdentity() {
  posthog.reset();
}

export default {
  initializeAnalytics,
  trackingEvents,
  trackPageView,
  identifyUser,
  resetIdentity,
  posthog
};