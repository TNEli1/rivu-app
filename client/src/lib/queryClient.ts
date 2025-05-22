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
    return import.meta.env.VITE_API_URL;
  }

  // Production environment detection
  const isProduction = 
    window.location.hostname === 'tryrivu.com' || 
    window.location.hostname.endsWith('.vercel.app') || 
    window.location.hostname.endsWith('.render.com') || 
    window.location.hostname.endsWith('.replit.app');

  // Determine the appropriate base URL based on environment
  if (isProduction) {
    // In production (tryrivu.com or other production domains)
    // Use the Render production backend URL
    return 'https://rivu-app.onrender.com';
  } else {
    // In development environment
    return 'http://localhost:8080';
  }
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get CSRF token from cookie if available
  const getCsrfToken = () => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('csrf_token='));
    return cookie ? cookie.split('=')[1] : '';
  };
  
  const csrfToken = getCsrfToken();
  
  // Construct full URL with API base URL in production
  const apiBaseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
  
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    // Add CSRF protection headers
    "X-Requested-With": "XMLHttpRequest",
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
  };

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Include cookies for authentication
  });

  await throwIfResNotOk(res);
  return res;
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

    const res = await fetch(fullUrl, {
      credentials: "include", // Include cookies for session authentication
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
