const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user';

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

export function getWsBase(): string {
  return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser<T = Record<string, unknown>>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function saveSession(access: string, refresh: string, user: unknown): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

let refreshPromise: Promise<boolean> | null = null;

/** Refresh JWT access token using stored refresh token. Returns true on success. */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    try {
      const res = await fetch(`${getApiBase()}/api/accounts/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (!res.ok) {
        clearSession();
        return false;
      }

      const data = await res.json();
      if (data.access) {
        localStorage.setItem(ACCESS_KEY, data.access);
        if (data.refresh) {
          localStorage.setItem(REFRESH_KEY, data.refresh);
        }
        return true;
      }
      clearSession();
      return false;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  clearSession();
  window.location.href = '/login';
}
