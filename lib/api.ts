import {
  getAccessToken,
  getApiBase,
  refreshAccessToken,
  redirectToLogin,
} from './auth';

export type ApiFetchOptions = RequestInit & {
  /** Skip Authorization header (e.g. login). */
  public?: boolean;
  /** Do not redirect to login on 401 after failed refresh. */
  skipAuthRedirect?: boolean;
};

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { public: isPublic, skipAuthRedirect, headers, ...init } = options;
  const apiBase = getApiBase();
  const url = path.startsWith('http') ? path : `${apiBase}${path}`;

  const buildHeaders = (): HeadersInit => {
    const h = new Headers(headers);
    if (!h.has('Content-Type') && !(init.body instanceof FormData)) {
      h.set('Content-Type', 'application/json');
    }
    if (!isPublic) {
      const token = getAccessToken();
      if (token) h.set('Authorization', `Bearer ${token}`);
    }
    return h;
  };

  let res = await fetch(url, { ...init, headers: buildHeaders() });

  if (res.status === 401 && !isPublic) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await fetch(url, { ...init, headers: buildHeaders() });
    } else if (!skipAuthRedirect) {
      redirectToLogin();
    }
  }

  return res;
}

export async function apiJson<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const res = await apiFetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { detail?: string; error?: string }).detail ||
      (data as { error?: string }).error ||
      res.statusText;
    throw new Error(message || 'Request failed');
  }
  return data as T;
}
