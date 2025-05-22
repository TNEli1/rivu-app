import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import posthog from 'posthog-js';
import { initializeAnalytics } from './lib/analytics';

// Always default to dark mode initially, then the ThemeProvider will handle the rest
document.documentElement.classList.add("dark");

// Initialize PostHog with direct integration as requested
const apiKey = import.meta.env.VITE_POSTHOG_API_KEY as string;
console.log('Initializing PostHog with key:', apiKey);

// Initialize PostHog with privacy-focused settings for a financial app
initializeAnalytics(apiKey);

// Log when PostHog has loaded
posthog.onFeatureFlags(() => {
  console.log('PostHog loaded successfully');
});

createRoot(document.getElementById("root")!).render(<App />);
