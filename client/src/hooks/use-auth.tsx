import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient
} from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type User = {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  token?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  updateProfileMutation: UseMutationResult<User, Error, UpdateProfileData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type UpdateProfileData = {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
};

// Helper function to store the token
const storeToken = (token: string) => {
  localStorage.setItem('rivuToken', token);
};

// Helper function to get the token
export const getToken = (): string | null => {
  return localStorage.getItem('rivuToken');
};

// Helper function to remove the token
const removeToken = () => {
  localStorage.removeItem('rivuToken');
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  // Load user from API if token exists
  const {
    data: userData,
    error,
    isLoading,
  } = useQuery<User>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;
      
      try {
        const res = await fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            // Token is invalid or expired
            removeToken();
            return null;
          }
          throw new Error('Failed to fetch user data');
        }
        
        return res.json();
      } catch (err) {
        console.error('Error fetching user:', err);
        return null;
      }
    },
    refetchOnWindowFocus: false,
  });

  // Update user state when userData changes
  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest('POST', '/api/login', credentials);
      return await res.json();
    },
    onSuccess: (data: User) => {
      // Store the token in localStorage
      if (data.token) {
        storeToken(data.token);
      }
      
      // Update user state
      setUser(data);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.firstName || data.username}!`,
      });
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
      return await res.json();
    },
    onSuccess: (data: User) => {
      // Store the token in localStorage
      if (data.token) {
        storeToken(data.token);
      }
      
      // Update user state
      setUser(data);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Registration successful",
        description: "Your account has been created!",
      });
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
      // Remove token from localStorage
      removeToken();
      
      // Clear user state
      setUser(null);
      
      // Clear any user-related cached data
      queryClient.clear();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: UpdateProfileData) => {
      const res = await apiRequest('PUT', '/api/user', profileData);
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
      toast({
        title: "Update failed",
        description: error.message || "Could not update profile. Please try again.",
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
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
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