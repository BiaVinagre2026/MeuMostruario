import type { ApiError as ApiErrorType } from "@/types/auth";

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: Record<string, string[]>;

  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function resolveTenantId(): string | undefined {
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 2) {
    const slug = parts[0];
    if (slug && !["www", "api", "admin", "app", "localhost"].includes(slug)) {
      return slug;
    }
  }
  return undefined;
}

const TENANT_ID = resolveTenantId();

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "";

const ADMIN_SLUG_EXEMPT_PREFIXES = [
  "/api/v1/admin/auth/",
  "/api/v1/admin/tenants",
];

function isAdminTenantScopedPath(path: string): boolean {
  if (!path.startsWith("/api/v1/admin/")) return false;
  return !ADMIN_SLUG_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

let _getOperatorActiveTenantSlug: (() => string | null) | null = null;

async function initOperatorStoreAccessor() {
  if (_getOperatorActiveTenantSlug) return;
  const { useOperatorStore } = await import("@/stores/useOperatorStore");
  _getOperatorActiveTenantSlug = () =>
    useOperatorStore.getState().activeTenantSlug;
}

void initOperatorStoreAccessor();

function buildHeaders(path: string, extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(extra as Record<string, string> | undefined),
  };

  if (!path.startsWith("/api/v1/admin/") && !path.startsWith("/api/v1/partner/") && TENANT_ID) {
    headers["X-Tenant-ID"] = TENANT_ID;
  }

  if (isAdminTenantScopedPath(path) && _getOperatorActiveTenantSlug) {
    const slug = _getOperatorActiveTenantSlug();
    if (slug) {
      headers["X-Admin-Tenant-Slug"] = slug;
    }
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return {} as T;
    }
    return response.json() as Promise<T>;
  }

  if (response.status === 401) {
    if (response.url.includes("/api/v1/admin/")) {
      import("@/stores/useOperatorStore").then(({ useOperatorStore }) => {
        useOperatorStore.getState().logout();
      });
    } else if (response.url.includes("/api/v1/partner/")) {
      import("@/stores/usePartnerStore").then(({ usePartnerStore }) => {
        usePartnerStore.getState().logout();
      });
    } else {
      import("@/stores/useAuthStore").then(({ useAuthStore }) => {
        useAuthStore.getState().logout();
      });
    }
  }

  let errorBody: ApiErrorType = { error: response.statusText };
  try {
    errorBody = (await response.json()) as ApiErrorType;
  } catch {
    // non-JSON error body
  }

  throw new ApiError(errorBody.error, response.status, errorBody.details);
}

export const apiClient = {
  get<T>(path: string, init?: RequestInit): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      method: "GET",
      credentials: "include",
      headers: buildHeaders(path, init?.headers),
    }).then((res) => handleResponse<T>(res));
  },

  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      method: "POST",
      credentials: "include",
      headers: buildHeaders(path, init?.headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((res) => handleResponse<T>(res));
  },

  patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      method: "PATCH",
      credentials: "include",
      headers: buildHeaders(path, init?.headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((res) => handleResponse<T>(res));
  },

  del<T>(path: string, init?: RequestInit): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      method: "DELETE",
      credentials: "include",
      headers: buildHeaders(path, init?.headers),
    }).then((res) => handleResponse<T>(res));
  },
};
