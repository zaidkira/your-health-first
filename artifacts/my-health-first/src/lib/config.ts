import { setBaseUrl as setClientBaseUrl } from "@workspace/api-client-react";

const STORAGE_KEY = "healthfirst_api_url";
export const RENDER_BACKEND_URL = "https://your-health-first.onrender.com";

export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).Capacitor?.isNativePlatform() ||
    window.location.protocol === "capacitor:" ||
    (window.location.hostname === "localhost" && /Android|iPhone|iPad/i.test(navigator.userAgent))
  );
}

export function getDefaultApiBaseUrl(): string {
  // 1. User manual override from localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved.trim()) {
    const trimmed = saved.trim().replace(/\/+$/, "");
    // Automatically purge old development IP overrides so the user connects seamlessly to Render
    if (trimmed.includes("10.11.146.76") || trimmed.includes("192.168.") || trimmed.includes("127.0.0.1:5000")) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      return trimmed;
    }
  }

  // 2. Build-time environment variable override
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // 3. Native Capacitor Android APK: always connect to Render cloud backend!
  if (isNativePlatform()) {
    return RENDER_BACKEND_URL;
  }

  // 4. Web browser environment
  if (typeof window !== "undefined") {
    // If accessed via localhost:5173 / localhost:3000 (local Vite dev server)
    if (window.location.port === "5173" || window.location.port === "3000") {
      return `http://${window.location.hostname}:5000`;
    }
    // If running in production (e.g. hosted on Render), use direct relative paths
    return "";
  }

  return RENDER_BACKEND_URL;
}

let currentBaseUrl = getDefaultApiBaseUrl();

// Initialize the API client base URL
export function initApiConfig(): void {
  currentBaseUrl = getDefaultApiBaseUrl();
  setClientBaseUrl(currentBaseUrl || null);
  console.info(`[Config] API Base URL configured to: ${currentBaseUrl || "Direct (relative)"}`);
}

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

export function saveApiBaseUrl(newUrl: string): void {
  const cleaned = newUrl.trim().replace(/\/+$/, "");
  if (cleaned) {
    localStorage.setItem(STORAGE_KEY, cleaned);
    currentBaseUrl = cleaned;
    setClientBaseUrl(cleaned);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    currentBaseUrl = getDefaultApiBaseUrl();
    setClientBaseUrl(currentBaseUrl || null);
  }
}
