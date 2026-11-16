import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initApiConfig } from "./lib/config";

// Ensure API base URL is resolved for mobile APK and web
initApiConfig();

createRoot(document.getElementById("root")!).render(<App />);
