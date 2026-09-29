import { apiClient } from "./client";
import { setActiveTenantSlug } from "@/lib/tenantContext";

describe("apiClient tenant explicito", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserva o tenant trazido por um link compartilhado", async () => {
    setActiveTenantSlug("demo");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await apiClient.get("/api/v1/catalog_links/token-coral", {
      headers: { "X-Tenant-ID": "mare-coral" },
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-Tenant-ID"]).toBe("mare-coral");
  });
});
