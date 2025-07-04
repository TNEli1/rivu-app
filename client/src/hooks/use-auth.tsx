import { createContext, ReactNode, useContext, useEffect, useState, useRef } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient
} from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// User's demographic information
export type Demographics = {
  ageRange?: string;
  incomeBracket?: string;
  goals?: string[];
  riskTolerance?: string;
  experienceLevel?: string;
  completed?: boolean;
  skipPermanently?: boolean;
  updatedAt?: string;
};

// Plaid connection data type
// Plaid integration has been removed

// Main user type
export type User = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePic?: string;
  avatarInitials?: string;
  token?: string;
  themePreference?: 'light' | 'dark';
  coachTone?: 'encouraging' | 'direct' | 'strict'; // Coach tone preference
  tutorialCompleted?: boolean; // Onboarding tutorial status
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  loginCount?: number;
  demographics?: Demographics;
  tosAcceptedAt?: string | Date | null;
  authMethod?: string;
  emailVerified?: boolean;
  googleId?: string;
};

// Auth context type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isTokenExpired: boolean;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  updateProfileMutation: UseMutationResult<User, Error, UpdateProfileData>;
  updateDemographicsMutation: UseMutationResult<any, Error, UpdateDemographicsData>;
};

// Login form data
type LoginData = {
  username: string;
  password: string;
};

// Registration form data
type RegisterData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
};

// Profile update data
type UpdateProfileData = {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  coachTone?: 'encouraging' | 'direct' | 'strict';
  tutorialCompleted?: boolean;
};

// Demographics update data
type UpdateDemographicsData = {
  demographics: {
    ageRange?: string;
    incomeBracket?: string;
    goals?: string[];
    riskTolerance?: string;
    experienceLevel?: string;
    completed?: boolean;
    skipPermanently?: boolean;
  }
};

// API error response format
type ApiErrorResponse = {
  message: string;
  code?: string;
};

// Helper function to store the token
// We now rely on HTTP-only cookies for security, but also 
// store a non-sensitive flag that indicates a user is logged in
const storeToken = (token: string) => {
  // Store only a login status flag, not the actual token
  localStorage.setItem('rivuLoggedIn', 'true');
  
  // Note: The actual token is stored in HTTP-only cookies by the server
};

// Helper function to check login status
export const getToken = (): string | null => {
  // Check if the login indicator exists
  // The actual token is managed securely in HTTP-only cookies
  return localStorage.getItem('rivuLoggedIn') ? 'session-active' : null;
};

// Helper function to remove login state and JWT token
const removeToken = () => {
  localStorage.removeItem('rivuLoggedIn');
  localStorage.removeItem('rivu_token'); // Clear the JWT token from localStorage
  localStorage.removeItem('rivu_user_info'); // Clear any cached user info
};

// Simplified method to check if we're logged in
// Since the actual JWT is stored in HTTP-only cookies, we can't check expiration directly
// We'll rely on API responses to tell us if the session is valid
const isTokenExpired = (loginIndicator: string | null): boolean => {
  // If we don't have a login indicator, we're not logged in
  if (!loginIndicator) return true;
  
  // We'll assume the session is valid if we have a login indicator
  // The server will reject requests if the cookie is expired
  return false;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();
  const [tokenExpired, setTokenExpired] = useState<boolean>(isTokenExpired(getToken()));
  const checkingInterval = useRef<number | null>(null);

  // Load user from API if token exists
  const {
    data: userData,
    error,
    isLoading,
    refetch
  } = useQuery<User>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;
      
      // Don't even try if token is expired
      if (isTokenExpired(token)) {
        setTokenExpired(true);
        removeToken();
        return null;
      }
      
      try {
        // Use the new profile endpoint that works with JWT cookies
        const res = await fetch('/api/profile', {
          credentials: 'include' // Include HTTP-only cookies
        });
        
        if (!res.ok) {
          // Parse error response
          let errorData: ApiErrorResponse;
          try {
            errorData = await res.json();
          } catch (e) {
            errorData = { message: 'Unknown error', code: 'UNKNOWN' };
          }
          
          // Handle specific error codes
          if (res.status === 401) {
            // Check for specific token expiration error
            if (errorData.code === 'TOKEN_EXPIRED') {
              setTokenExpired(true);
              toast({
                title: "Session expired",
                description: "Your session has expired. Please log in again.",
                variant: "default",
              });
            }
            
            // Any 401 should remove token
            removeToken();
            return null;
          }
          
          throw new Error(errorData.message || 'Failed to fetch user data');
        }
        
        // Valid response - token is working
        setTokenExpired(false);
        return res.json();
      } catch (err) {
        console.error('Error fetching user:', err);
        return null;
      }
    },
    refetchOnWindowFocus: false, // We manage expiration checks ourselves
    retry: false, // Don't retry failed requests - handle manually
  });

  // Update user state when userData changes
  useEffect(() => {
    if (userData) {
      setUser(userData);
    } else if (userData === null && user !== null) {
      // If userData is null but we had a user before, clear it
      setUser(null);
    }
  }, [userData, user]);

  // Listen for OAuth authentication events
  useEffect(() => {
    const handleAuthStateChange = () => {
      console.log('Auth state change detected, refetching user data');
      refetch();
    };

    // Listen for custom auth state change events
    window.addEventListener('authStateChanged', handleAuthStateChange);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, [refetch]);

  // Set up token expiration checking
  useEffect(() => {
    // Check token expiration immediately
    const checkTokenExpiration = () => {
      const token = getToken();
      const expired = isTokenExpired(token);
      
      // If token just expired and we thought it was valid
      if (expired && !tokenExpired) {
        setTokenExpired(true);
        removeToken();
        setUser(null);
        
        // Clear any user-related cached data
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        
        toast({
          title: "Session expired",
          description: "Your session has expired. Please log in again.",
          variant: "default",
        });
        
        // Redirect to login page
        setLocation("/auth");
      }
      
      // Update expired state
      setTokenExpired(expired);
    };
    
    // Check immediately
    checkTokenExpiration();
    
    // Set up interval to check token expiration (every minute)
    checkingInterval.current = window.setInterval(checkTokenExpiration, 60000);
    
    // Clean up interval on unmount
    return () => {
      if (checkingInterval.current) {
        clearInterval(checkingInterval.current);
      }
    };
  }, [toast, tokenExpired, queryClient, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest('POST', '/api/login', credentials);
      
      if (!res.ok) {
        const errorData: ApiErrorResponse = await res.json();
        throw new Error(errorData.message || "Invalid username or password");
      }
      
      return await res.json();
    },
    onSuccess: (data: User) => {
      // Set login indicator in localStorage
      // The actual token is stored as HTTP-only cookie on the server
      storeToken('session-active');
      setTokenExpired(false);
      
      // Update user state
      setUser(data);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.firstName || data.username}!`,
      });
      
      // Redirect to dashboard after successful login
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest('POST', '/api/register', userData);
      
      if (!res.ok) {
        const errorData: ApiErrorResponse = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      
      return await res.json();
    },
    onSuccess: (data: User) => {
      // Set login indicator in localStorage
      // The actual token is stored as HTTP-only cookie on the server
      storeToken('session-active');
      setTokenExpired(false);
      
      // Update user state
      setUser(data);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Registration successful",
        description: "Your account has been created!",
      });
      
      // Redirect to onboarding for new users
      setLocation("/onboarding");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      // Clear local storage login indicator
      removeToken();
      setTokenExpired(true);
      
      // Also clear any other app data from storage
      localStorage.removeItem('theme');
      localStorage.removeItem('onboarding-viewed');
      sessionStorage.clear();
      
      // Clear user state
      setUser(null);
      
      // Clear any user-related cached data
      queryClient.clear();
      
      // Redirect to login page
      setLocation("/auth");
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      // Even if server logout fails, clean up client state
      removeToken();
      setTokenExpired(true);
      setUser(null);
      queryClient.clear();
      setLocation("/auth");
      
      toast({
        title: "Logout issue",
        description: "You've been logged out, but there was a server error: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: UpdateProfileData) => {
      const res = await apiRequest('PUT', '/api/user', profileData);
      
      if (!res.ok) {
        const errorData: ApiErrorResponse = await res.json();
        
        // Handle 401 errors specially
        if (res.status === 401) {
          setTokenExpired(true);
          removeToken();
          throw new Error("Your session has expired. Please log in again.");
        }
        
        throw new Error(errorData.message || "Could not update profile");
      }
      
      return await res.json();
    },
    onSuccess: (data: User) => {
      // Update user state
      setUser((prev) => prev ? { ...prev, ...data } : data);
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      // If token expired, redirect to login
      if (error.message.includes("session has expired")) {
        setLocation("/auth");
      }
      
      toast({
        title: "Update failed",
        description: error.message || "Could not update profile. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Add demographics update mutation
  const updateDemographicsMutation = useMutation({
    mutationFn: async (data: UpdateDemographicsData) => {
      const res = await apiRequest('PUT', '/api/user/demographics', data);
      
      if (!res.ok) {
        const errorData: ApiErrorResponse = await res.json();
        
        // Handle 401 errors specially
        if (res.status === 401) {
          setTokenExpired(true);
          removeToken();
          throw new Error("Your session has expired. Please log in again.");
        }
        
        throw new Error(errorData.message || "Could not update demographics");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Update the user cache with the new demographics
      if (user) {
        setUser({
          ...user,
          demographics: data.demographics
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Demographics updated",
        description: "Your preferences have been saved successfully.",
      });
      
      // If onboarding was completed, redirect to dashboard
      if (data.demographics?.completed) {
        setLocation("/dashboard");
      }
    },
    onError: (error: Error) => {
      // If token expired, redirect to login
      if (error.message.includes("session has expired")) {
        setLocation("/auth");
      }
      
      toast({
        title: "Update failed",
        description: error.message || "Could not update your preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error: error as Error,
        isTokenExpired: tokenExpired,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
        updateDemographicsMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}