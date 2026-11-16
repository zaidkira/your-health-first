import { getApiBaseUrl } from "./config";

export function getFullApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const fullUrl = getFullApiUrl(path);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(fullUrl, {
    ...init,
    headers,
  });
}
