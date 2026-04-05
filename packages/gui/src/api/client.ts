/**
 * Core API fetch wrapper.
 * Attaches JWT from localStorage, handles 401 → logout redirect.
 */

// In production the GUI is a static site with no proxy, so all API calls must
// be prefixed with the API origin. In dev, Vite proxies the paths directly.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

const TOKEN_KEY = "ea_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new ApiError(401, "Unauthorised");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data: unknown = await res.json();

  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as Record<string, unknown>).message === "string"
        ? (data as { message: string }).message
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export async function apiFetchBlob(method: string, path: string, body?: unknown): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new ApiError(401, "Unauthorised");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? (data as { message: string }).message
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return res.blob();
}
