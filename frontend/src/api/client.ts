import axios from 'axios';

const TOKEN_KEY = 'simpleinvoice.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the token and bounce to login (handled by route guard reacting
// to the missing token). A custom event lets the AuthContext react immediately.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('simpleinvoice:unauthorized'));
    }
    return Promise.reject(error);
  },
);

/** Extract a human-readable message from an API error response. */
export function extractErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
