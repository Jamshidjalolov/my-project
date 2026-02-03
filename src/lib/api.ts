import { getToken } from "./auth";

// API manzilini envdan olamiz; bo'lmasa joriy hostga moslaymiz.
export const API_URL =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:8000`;

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth, headers, ...rest } = options;
  const mergedHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(headers || {}),
  };

  const token = getToken();
  if (token && auth !== false) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers: mergedHeaders, ...rest });
  if (!res.ok) {
    const errData = await parseJsonResponse<{ detail?: string }>(res);
    throw new Error(errData.detail || `Request failed with ${res.status}`);
  }
  return parseJsonResponse<T>(res);
}

// Rasm URL'ini to'g'ri formatga keltiramiz (data:, http(s) yoki backenddan).
export function resolveImageUrl(image?: string | null): string {
  if (!image) return "";
  const value = image.trim();
  if (!value) return "";
  if (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("//")
  ) {
    return value;
  }
  const base = API_URL.replace(/\/$/, "");
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${base}${path}`;
}
