import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initPostHog } from "./lib/posthog";

// Always default to dark mode initially, then the ThemeProvider will handle the rest
document.documentElement.classList.add("dark");

// Initialize PostHog analytics when in production
if (import.meta.env.PROD) {
  initPostHog();
}

createRoot(document.getElementById("root")!).render(<App />);
