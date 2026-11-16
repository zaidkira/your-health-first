import { setBaseUrl as setClientBaseUrl } from "@workspace/api-client-react";

const STORAGE_KEY = "healthfirst_api_url";

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
    return saved.trim().replace(/\/+$/, "");
  }

  // 2. Native Capacitor Android APK default: local development LAN IP of your host PC
  if (isNativePlatform()) {
    return "http://10.11.146.76:5000";
  }

  // 3. Web browser environment
  if (typeof window !== "undefined") {
    // If accessed via localhost:5173, backend is on localhost:5000
    if (window.location.port === "5173" || window.location.port === "3000") {
      return `http://${window.location.hostname}:5000`;
    }
    // If accessed via LAN IP on browser (e.g. http://10.11.146.76:5173)
    if (window.location.port) {
      return `http://${window.location.hostname}:5000`;
    }
  }

  return "";
}

let currentBaseUrl = getDefaultApiBaseUrl();

// Initialize the API client base URL
export function initApiConfig(): void {
  currentBaseUrl = getDefaultApiBaseUrl();
  if (currentBaseUrl) {
    setClientBaseUrl(currentBaseUrl);
    console.info(`[Config] API Base URL configured to: ${currentBaseUrl}`);
  }
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
