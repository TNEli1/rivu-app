import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import posthog from 'posthog-js';
import { initializeAnalytics } from './lib/analytics';

// Always default to dark mode initially, then the ThemeProvider will handle the rest
document.documentElement.classList.add("dark");

// Initialize PostHog with direct integration as requested
const apiKey = import.meta.env.VITE_POSTHOG_API_KEY as string;

// Add debugging to help identify environment variable issues
if (!apiKey) {
  console.warn('VITE_POSTHOG_API_KEY environment variable is not set. Please ensure it is set in your production environment.');
  console.log('Available environment variables:', 
    Object.keys(import.meta.env)
      .filter(key => !key.includes('PASSWORD') && !key.includes('SECRET') && !key.includes('KEY'))
      .join(', ')
  );
} else {
  console.log('PostHog API key found with length:', apiKey.length);
}

// Initialize PostHog with privacy-focused settings for a financial app
initializeAnalytics(apiKey);

// Log when PostHog has loaded
posthog.onFeatureFlags(() => {
  console.log('PostHog loaded successfully');
});

createRoot(document.getElementById("root")!).render(<App />);
