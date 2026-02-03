const TOKEN_KEY = "accessToken";
const listeners = new Set<() => void>();

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  listeners.forEach((listener) => listener());
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
