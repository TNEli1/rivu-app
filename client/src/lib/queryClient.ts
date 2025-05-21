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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    // Add CSRF protection header
    "X-Requested-With": "XMLHttpRequest"
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Include cookies for authentication
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // We now rely on HTTP-only cookies for authentication
    const headers: Record<string, string> = {
      // Add CSRF protection header
      "X-Requested-With": "XMLHttpRequest"
    };

    const res = await fetch(queryKey[0] as string, {
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
