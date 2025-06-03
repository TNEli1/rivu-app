import { useCallback } from 'react';

interface PlaidOAuthConfig {
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit: (error?: any) => void;
}

/**
 * Production-ready Plaid OAuth redirect handler
 * Detects oauth_state_id in URL and resumes Plaid Link with stored link token
 */
export function usePlaidOAuth({ onSuccess, onExit }: PlaidOAuthConfig) {
  
  const handleOAuthRedirect = useCallback(async () => {
    const query = new URLSearchParams(window.location.search);
    const oauthStateId = query.get('oauth_state_id');
    
    if (!oauthStateId) {
      return null; // Not an OAuth redirect
    }
    
    // Retrieve the previously stored link token
    const linkToken = window.localStorage.getItem('plaid_link_token');
    
    if (!linkToken) {
      console.error('No stored link token found for OAuth redirect');
      onExit(new Error('OAuth session expired. Please try connecting your bank again.'));
      return null;
    }
    
    console.log('OAuth redirect detected, resuming Plaid Link with stored token');
    
    try {
      // Import Plaid Link dynamically
      const { usePlaidLink } = await import('react-plaid-link');
      
      // We need to create the Plaid config and initialize it
      // Since we're in a callback context, we'll create the link directly
      const linkConfig = {
        token: linkToken,
        receivedRedirectUri: window.location.href,
        onSuccess: (publicToken: string, metadata: any) => {
          // Clean up stored token after successful completion
          window.localStorage.removeItem('plaid_link_token');
          window.localStorage.removeItem('plaid_link_config');
          onSuccess(publicToken, metadata);
        },
        onExit: (error?: any) => {
          // Clean up stored token on exit
          window.localStorage.removeItem('plaid_link_token');
          window.localStorage.removeItem('plaid_link_config');
          onExit(error);
        }
      };
      
      // Since we're in a hook context, we need to use the Plaid SDK directly
      // Check if Plaid is available on window (loaded via script)
      if (typeof window !== 'undefined' && (window as any).Plaid) {
        const plaidHandler = (window as any).Plaid.create(linkConfig);
        plaidHandler.open();
        return plaidHandler;
      } else {
        console.error('Plaid SDK not loaded');
        onExit(new Error('Bank connection library not loaded'));
        return null;
      }
    } catch (error) {
      console.error('Error initializing Plaid Link for OAuth:', error);
      onExit(new Error('Failed to initialize bank connection'));
      return null;
    }
  }, [onSuccess, onExit]);
  
  return { handleOAuthRedirect };
}

/**
 * Stores link token for OAuth flows
 * Call this when creating a new link token that might be used for OAuth
 */
export function storeLinkTokenForOAuth(linkToken: string, expiration?: string) {
  window.localStorage.setItem('plaid_link_token', linkToken);
  
  const tokenConfig = {
    link_token: linkToken,
    expiration,
    timestamp: Date.now(),
    ttl: Date.now() + (30 * 60 * 1000) // 30 minute TTL
  };
  
  window.localStorage.setItem('plaid_link_config', JSON.stringify(tokenConfig));
  console.log('Stored link token for potential OAuth redirect');
}

/**
 * Checks if current URL is an OAuth redirect
 */
export function isPlaidOAuthRedirect(): boolean {
  const query = new URLSearchParams(window.location.search);
  return query.has('oauth_state_id');
}