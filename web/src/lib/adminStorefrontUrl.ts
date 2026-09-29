export function adminStorefrontUrl(
  companyWebsite: string | null,
  tenantSlug: string | null,
  location: Pick<Location, "protocol" | "hostname"> = window.location,
  isDev = import.meta.env.DEV,
  mareCoralPort = (import.meta.env.VITE_MARE_CORAL_STOREFRONT_PORT as string | undefined) || "4311"
): string | null {
  if (isDev && tenantSlug === "mare-coral") {
    return `${location.protocol}//${location.hostname}:${mareCoralPort}/`;
  }
  return companyWebsite;
}
