import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper to check if user is logged in
const getAuthToken = (): string | null => {
  // Now we rely on HTTP-only cookies for actual authentication
  // This only checks if a user session is active based on localStorage flag
  return localStorage.getItem('rivuLoggedIn') ? 'session-active' : null;
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper function to get the API base URL
export const getApiBaseUrl = (): string => {
  // If VITE_API_URL is explicitly set, use it as highest priority
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    console.log(`Using API URL from environment: ${url}`);
    return url;
  }

  // Production environment detection
  const hostname = window.location.hostname;
  const isProduction = 
    hostname === 'tryrivu.com' || 
    hostname.includes('tryrivu.com') || // Include subdomains
    hostname.endsWith('.vercel.app') || 
    hostname.endsWith('.render.com');

  console.log(`Hostname detected: ${hostname}, isProduction: ${isProduction}`);

  // Determine the appropriate base URL based on environment
  if (isProduction) {
    // In production (tryrivu.com or other production domains)
    // Use the Render production backend URL
    const prodUrl = 'https://rivu-app.onrender.com';
    console.log(`Using production API URL: ${prodUrl}`);
    return prodUrl;
  } else {
    // In development environment
    const devUrl = 'http://localhost:8080';
    console.log(`Using development API URL: ${devUrl}`);
    return devUrl;
  }
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    // Get CSRF token from cookie if available
    const getCsrfToken = () => {
      const cookie = document.cookie.split('; ').find(row => row.startsWith('csrf_token='));
      return cookie ? cookie.split('=')[1] : '';
    };
    
    const csrfToken = getCsrfToken();
    console.log(`CSRF Token available: ${Boolean(csrfToken)}`);
    
    // Construct full URL with API base URL in production
    const apiBaseUrl = getApiBaseUrl();
    const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
    
    console.log(`[DEBUG] Making ${method} request to: ${fullUrl}`); 
    if (data) {
      console.log(`[DEBUG] Request payload:`, data);
    }
    
    const headers: Record<string, string> = {
      ...(data ? { "Content-Type": "application/json" } : {}),
      // Add CSRF protection headers
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
    };

    console.log(`[DEBUG] Request headers:`, headers);

    // Setup retry mechanism for network errors
    let retries = 0;
    const maxRetries = 2;
    
    while (retries <= maxRetries) {
      try {
        console.log(`[DEBUG] Attempting fetch (${retries === 0 ? 'initial' : `retry ${retries}`})`);
        
        const fetchStartTime = Date.now();
        const res = await fetch(fullUrl, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include", // Include cookies for authentication
          mode: 'cors', // Explicitly request CORS mode
        });
        const fetchEndTime = Date.now();
        
        console.log(`[DEBUG] Fetch completed in ${fetchEndTime - fetchStartTime}ms`);
        console.log(`[DEBUG] Response status: ${res.status} ${res.statusText}`);
        
        // Try to get response headers for debugging
        try {
          const responseHeaders: Record<string, string> = {};
          res.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });
          console.log(`[DEBUG] Response headers:`, responseHeaders);
        } catch (headerError) {
          console.log(`[DEBUG] Could not read response headers: ${headerError}`);
        }
        
        // Don't retry for client errors (4xx)
        if (res.status >= 400 && res.status < 500) {
          console.log(`[DEBUG] Client error (${res.status}), not retrying`);
          try {
            const errorResponse = await res.clone().text();
            console.log(`[DEBUG] Error response body: ${errorResponse}`);
          } catch (textError) {
            console.log(`[DEBUG] Could not read error response: ${textError}`);
          }
          
          await throwIfResNotOk(res);
          return res;
        }
        
        // Check if successful
        if (res.ok) {
          console.log(`[DEBUG] Request successful`);
          return res;
        }
        
        // If we get here, it's a server error (5xx) which may be retried
        if (retries === maxRetries) {
          console.log(`[DEBUG] Max retries reached, returning error response`);
          try {
            const errorResponse = await res.clone().text();
            console.log(`[DEBUG] Final error response: ${errorResponse}`);
          } catch (textError) {
            console.log(`[DEBUG] Could not read final error response: ${textError}`);
          }
          
          await throwIfResNotOk(res);
          return res;
        }
        
        // Log retry attempt
        console.log(`[DEBUG] Retrying request due to ${res.status} error (attempt ${retries + 1} of ${maxRetries})`);
      } catch (fetchError) {
        // If this is the last retry, rethrow
        if (retries === maxRetries) {
          console.log(`[DEBUG] Network error on final retry:`, fetchError);
          if (fetchError instanceof TypeError && 
              (fetchError.message.includes('Failed to fetch') || 
               fetchError.message.includes('NetworkError'))) {
            throw new Error(`Network error connecting to ${apiBaseUrl}. Please check if the server is accessible.`);
          }
          throw fetchError;
        }
        console.log(`[DEBUG] Network error, retrying (attempt ${retries + 1} of ${maxRetries}):`, fetchError);
      }
      
      // Exponential backoff
      const backoffTime = 1000 * Math.pow(2, retries);
      console.log(`[DEBUG] Waiting ${backoffTime}ms before retry`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      retries++;
    }
    
    // Should never reach here due to throw in the loop
    throw new Error("Request failed after retries");
  } catch (error) {
    // Log and rethrow with detailed information
    console.error("[DEBUG] API request failed:", error);
    if (error instanceof Error) {
      // Enhance error message to be more user-friendly
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') || 
          error.message.includes('Network error')) {
        throw new Error(`Unable to connect to the server at ${getApiBaseUrl()}. Please check your network connection or if the server is running.`);
      }
      throw error;
    }
    throw new Error(`Load failed: Unable to connect to the server`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
// Helper function to get CSRF token from cookies
const getCsrfToken = () => {
  if (typeof document === 'undefined') return '';
  const cookie = document.cookie.split('; ').find(row => row.startsWith('csrf_token='));
  return cookie ? cookie.split('=')[1] : '';
};

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // We now rely on HTTP-only cookies for authentication
    const csrfToken = getCsrfToken();
    console.log(`[DEBUG][getQueryFn] CSRF Token available: ${Boolean(csrfToken)}`);
    
    const headers: Record<string, string> = {
      // Add CSRF protection headers
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
    };

    // Get first query key as URL path
    const urlPath = queryKey[0] as string;
    
    // Construct full URL with API base URL for production environment
    const apiBaseUrl = getApiBaseUrl();
    const fullUrl = urlPath.startsWith('http') ? urlPath : `${apiBaseUrl}${urlPath}`;
    console.log(`[DEBUG][getQueryFn] Making request to: ${fullUrl}`);

    try {
      const fetchStartTime = Date.now();
      const res = await fetch(fullUrl, {
        credentials: "include", // Include cookies for session authentication
        headers,
        mode: 'cors' // Explicitly request CORS mode
      });
      const fetchEndTime = Date.now();
      
      console.log(`[DEBUG][getQueryFn] Fetch completed in ${fetchEndTime - fetchStartTime}ms`);
      console.log(`[DEBUG][getQueryFn] Response status: ${res.status} ${res.statusText}`);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`[DEBUG][getQueryFn] Unauthorized (401) with returnNull policy`);
        return null;
      }

      // Try to get response headers for debugging
      try {
        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        console.log(`[DEBUG][getQueryFn] Response headers:`, responseHeaders);
      } catch (headerError) {
        console.log(`[DEBUG][getQueryFn] Could not read response headers: ${headerError}`);
      }

      if (!res.ok) {
        try {
          // Clone response to avoid consuming the body before throwIfResNotOk
          const errorText = await res.clone().text();
          console.log(`[DEBUG][getQueryFn] Error response body: ${errorText}`);
        } catch (textError) {
          console.log(`[DEBUG][getQueryFn] Could not read error response: ${textError}`);
        }
      } else {
        console.log(`[DEBUG][getQueryFn] Request successful`);
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`[DEBUG][getQueryFn] Request failed:`, error);
      
      // Enhance error messages for network failures
      if (error instanceof TypeError && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError'))) {
        throw new Error(`Unable to connect to ${apiBaseUrl}. Please check your network connection or if the server is running.`);
      }
      
      throw error;
    }
  };

// Helper to invalidate related queries when data changes
export const invalidateRelatedQueries = (type: 'transaction' | 'budget' | 'goal') => {
  const queryKeysToInvalidate = [
    // Always invalidate the dashboard summary data
    ['/api/transactions/summary'],
    
    // Always invalidate Rivu Score when financial data changes
    ['/api/rivu-score'],
    
    // Conditionally invalidate other queries based on type
    ...(type === 'transaction' ? [['/api/transactions']] : []),
    ...(type === 'budget' ? [['/api/budget-categories']] : []),
    ...(type === 'goal' ? [['/api/goals'], ['/api/goals/summary']] : [])
  ];
  
  // Invalidate all related queries
  queryKeysToInvalidate.forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey });
  });
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: true, // Enable to refresh data when tab becomes active
      refetchOnMount: true, // Enable to ensure fresh data on component mount
      staleTime: 60000, // Consider data stale after 1 minute to trigger fresh fetches
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
