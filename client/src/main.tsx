import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Always default to dark mode initially, then the ThemeProvider will handle the rest
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
