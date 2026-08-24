import { getActiveTenantSlug, resolveTenantSlugFromHost } from "@/lib/tenantContext";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperatorStore } from "@/stores/useOperatorStore";

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

const TENANT_ID = resolveTenantSlugFromHost(window.location.hostname);

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "";

const ADMIN_SLUG_EXEMPT_PREFIXES = [
  "/api/v1/admin/auth/",
  "/api/v1/admin/tenants",
];

function isAdminTenantScopedPath(path: string): boolean {
  if (!path.startsWith("/api/v1/admin/")) return false;
  return !ADMIN_SLUG_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function buildHeaders(path: string, extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(extra as Record<string, string> | undefined),
  };

  if (!path.startsWith("/api/v1/admin/") && !path.startsWith("/api/v1/partner/")) {
    const tenantId = TENANT_ID ?? getActiveTenantSlug();
    if (tenantId) headers["X-Tenant-ID"] = tenantId;
  }

  if (isAdminTenantScopedPath(path)) {
    const slug = useOperatorStore.getState().activeTenantSlug;
    if (slug) {
      headers["X-Admin-Tenant-Slug"] = slug;
    }
  }

  return headers;
}

function buildFormHeaders(path: string, extra?: HeadersInit): Record<string, string> {
  const headers = buildHeaders(path, extra);
  delete headers["Content-Type"];
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
      useOperatorStore.getState().logout();
    } else if (response.url.includes("/api/v1/partner/")) {
      import("@/stores/usePartnerStore").then(({ usePartnerStore }) => {
        usePartnerStore.getState().logout();
      });
    } else {
      useAuthStore.getState().logout();
    }
  }

  let message = response.statusText;
  let details: Record<string, string[]> | undefined;
  try {
    const body = await response.json() as { error?: string; errors?: string[] | string; details?: Record<string, string[]> };
    if (body.error) message = body.error;
    else if (Array.isArray(body.errors)) message = body.errors.join(", ");
    else if (typeof body.errors === "string") message = body.errors;
    details = body.details;
  } catch {
    // non-JSON error body
  }

  throw new ApiError(message, response.status, details);
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

  postForm<T>(path: string, body: FormData, init?: RequestInit): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      method: "POST",
      credentials: "include",
      headers: buildFormHeaders(path, init?.headers),
      body,
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
