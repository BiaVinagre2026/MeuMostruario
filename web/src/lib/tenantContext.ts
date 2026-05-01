// Singleton mutable para que o apiClient saiba o tenant mesmo no localhost.
// TenantProvider chama setActiveTenantSlug() ao resolver o config.

let _slug: string | undefined;

export function setActiveTenantSlug(slug: string): void {
  _slug = slug;
}

export function getActiveTenantSlug(): string | undefined {
  return _slug;
}
