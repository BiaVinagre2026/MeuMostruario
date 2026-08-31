import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { TenantWorkspaceTabs } from "@/components/admin/TenantWorkspaceTabs";

const apiGet = vi.fn();
const openGlobal = vi.fn();
const openTenant = vi.fn();

let storeState = {
  operator: { role: "super_admin" as "admin" | "super_admin" },
  activeTenantSlug: null as string | null,
};

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: (...args: unknown[]) => apiGet(...args) },
}));

vi.mock("@/hooks/useTenantWorkspace", () => ({
  useTenantWorkspace: () => ({ openGlobal, openTenant }),
}));

vi.mock("@/stores/useOperatorStore", () => ({
  useOperatorStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

function renderTabs() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TenantWorkspaceTabs />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TenantWorkspaceTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState = {
      operator: { role: "super_admin" },
      activeTenantSlug: null,
    };
    apiGet.mockResolvedValue({
      tenants: [
        { id: 2, name: "Maré Coral Fitwear", slug: "mare-coral", plan: "growth", status: "active" },
        { id: 1, name: "Demo", slug: "demo", plan: "starter", status: "active" },
        { id: 3, name: "Cliente suspenso", slug: "suspenso", plan: "starter", status: "suspended" },
      ],
    });
  });

  it("lists active clients as tabs and opens the selected operation", async () => {
    renderTabs();

    const coralTab = await screen.findByRole("button", { name: "Maré Coral Fitwear" });
    expect(screen.queryByRole("button", { name: "Cliente suspenso" })).not.toBeInTheDocument();

    fireEvent.click(coralTab);

    await waitFor(() => expect(openTenant).toHaveBeenCalledWith("mare-coral"));
  });

  it("returns to the global view from any client tab", async () => {
    storeState.activeTenantSlug = "mare-coral";
    renderTabs();

    fireEvent.click(await screen.findByRole("button", { name: "Visão global" }));

    await waitFor(() => expect(openGlobal).toHaveBeenCalledTimes(1));
  });

  it("does not render client switching for tenant admins", () => {
    storeState = {
      operator: { role: "admin" },
      activeTenantSlug: "demo",
    };

    const { container } = renderTabs();
    expect(container).toBeEmptyDOMElement();
    expect(apiGet).not.toHaveBeenCalled();
  });
});

