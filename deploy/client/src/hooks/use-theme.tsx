import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './use-auth';
import { apiRequest } from '@/lib/queryClient';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [theme, setThemeState] = useState<Theme>(() => {
    // First check localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      return 'dark';
    }
    
    // Default to light mode
    return 'light';
  });

  // Apply the initial theme immediately on load to prevent flash
  useEffect(() => {
    // This runs once on first render before any state updates
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // Update the DOM when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Persist to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // If user has a preference stored in their profile, use that
  useEffect(() => {
    if (user?.themePreference && (user.themePreference === 'light' || user.themePreference === 'dark')) {
      setThemeState(user.themePreference);
    } else if (user) {
      // If user exists but doesn't have a theme preference, default to light mode
      setThemeState('light');
    }
    setIsThemeReady(true);
  }, [user]);

  // Set theme and persist to backend if user is logged in
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // If user is logged in, save preference to their profile
    if (user) {
      try {
        await apiRequest('PUT', '/api/user/theme-preference', { themePreference: newTheme });
      } catch (error) {
        console.error('Failed to save theme preference to profile', error);
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}