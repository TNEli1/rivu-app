import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Read theme from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || !savedTheme) {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
