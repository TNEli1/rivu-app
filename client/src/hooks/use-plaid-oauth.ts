import { useCallback } from 'react';

interface PlaidOAuthConfig {
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit: (error?: any) => void;
}

/**
 * Production-ready Plaid OAuth redirect handler
 * Detects oauth_state_id in URL and resumes Plaid Link with stored link token
 * CRITICAL: Never re-create link token after redirect - only use stored token
 */
export function usePlaidOAuth({ onSuccess, onExit }: PlaidOAuthConfig) {
  
  const handleOAuthRedirect = useCallback(() => {
    const query = new URLSearchParams(window.location.search);
    const oauthStateId = query.get('oauth_state_id');
    
    if (!oauthStateId) {
      return null; // Not an OAuth redirect
    }
    
    // CRITICAL: Retrieve the previously stored link token - never create new one
    const linkToken = window.localStorage.getItem('plaid_link_token');
    
    if (!linkToken) {
      console.error('No stored link token found for OAuth redirect - localStorage may not have survived redirect');
      onExit(new Error('OAuth session expired. Please try connecting your bank again.'));
      return null;
    }
    
    console.log('OAuth redirect detected, resuming Plaid Link with stored token:', linkToken.substring(0, 20) + '...');
    
    // Verify Plaid SDK is loaded
    if (typeof window === 'undefined' || !(window as any).Plaid) {
      console.error('Plaid SDK not loaded on window object');
      onExit(new Error('Bank connection library not loaded'));
      return null;
    }
    
    try {
      // Create Plaid handler with stored token and current URL as receivedRedirectUri
      const linkConfig = {
        token: linkToken,
        receivedRedirectUri: window.location.href,
        onSuccess: (publicToken: string, metadata: any) => {
          console.log('OAuth flow completed successfully');
          // Clean up stored token after successful completion
          window.localStorage.removeItem('plaid_link_token');
          window.localStorage.removeItem('plaid_link_config');
          onSuccess(publicToken, metadata);
        },
        onExit: (error?: any) => {
          console.log('OAuth flow exited', error ? 'with error:' : 'by user', error?.error_message || '');
          // Clean up stored token on exit
          window.localStorage.removeItem('plaid_link_token');
          window.localStorage.removeItem('plaid_link_config');
          onExit(error);
        }
      };
      
      console.log('Creating Plaid handler with config:', {
        hasToken: !!linkConfig.token,
        tokenPreview: linkConfig.token ? linkConfig.token.substring(0, 20) + '...' : 'none',
        receivedRedirectUri: linkConfig.receivedRedirectUri
      });
      
      const plaidHandler = (window as any).Plaid.create(linkConfig);
      
      // Open immediately - no waiting for ready state needed in OAuth flow
      plaidHandler.open();
      
      return plaidHandler;
      
    } catch (error: any) {
      console.error('Error creating Plaid handler for OAuth:', error);
      onExit(new Error('Failed to initialize bank connection: ' + error.message));
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
  try {
    // Test localStorage availability
    window.localStorage.setItem('plaid_test', 'test');
    window.localStorage.removeItem('plaid_test');
    
    window.localStorage.setItem('plaid_link_token', linkToken);
    
    const tokenConfig = {
      link_token: linkToken,
      expiration,
      timestamp: Date.now(),
      ttl: Date.now() + (30 * 60 * 1000), // 30 minute TTL
      domain: window.location.hostname,
      protocol: window.location.protocol
    };
    
    window.localStorage.setItem('plaid_link_config', JSON.stringify(tokenConfig));
    
    // Verify storage worked
    const storedToken = window.localStorage.getItem('plaid_link_token');
    const storedConfig = window.localStorage.getItem('plaid_link_config');
    
    console.log('Stored link token for OAuth redirect:', {
      tokenStored: !!storedToken,
      configStored: !!storedConfig,
      tokenPreview: storedToken ? storedToken.substring(0, 20) + '...' : 'none',
      domain: window.location.hostname,
      protocol: window.location.protocol
    });
    
    return true;
  } catch (error) {
    console.error('Failed to store link token in localStorage:', error);
    return false;
  }
}

/**
 * Checks if current URL is an OAuth redirect
 */
export function isPlaidOAuthRedirect(): boolean {
  const query = new URLSearchParams(window.location.search);
  return query.has('oauth_state_id');
}

/**
 * Debug localStorage state for OAuth troubleshooting
 */
export function debugOAuthState() {
  const query = new URLSearchParams(window.location.search);
  const oauthStateId = query.get('oauth_state_id');
  const linkToken = window.localStorage.getItem('plaid_link_token');
  const linkConfig = window.localStorage.getItem('plaid_link_config');
  
  let parsedConfig = null;
  try {
    parsedConfig = linkConfig ? JSON.parse(linkConfig) : null;
  } catch (e) {
    console.error('Failed to parse stored link config:', e);
  }
  
  const debugInfo = {
    currentUrl: window.location.href,
    oauthStateId,
    hasLinkToken: !!linkToken,
    hasLinkConfig: !!linkConfig,
    linkTokenPreview: linkToken ? linkToken.substring(0, 20) + '...' : 'none',
    configTimestamp: parsedConfig?.timestamp ? new Date(parsedConfig.timestamp).toISOString() : 'none',
    configTTL: parsedConfig?.ttl ? new Date(parsedConfig.ttl).toISOString() : 'none',
    configExpired: parsedConfig?.ttl ? Date.now() > parsedConfig.ttl : 'unknown',
    storageAvailable: typeof(Storage) !== "undefined",
    localStorageSize: Object.keys(localStorage).length,
    cookiesEnabled: navigator.cookieEnabled,
    userAgent: navigator.userAgent.substring(0, 100)
  };
  
  console.log('Plaid OAuth Debug State:', debugInfo);
  return debugInfo;
}