import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import AdminLogin from "./AdminLogin";

const mockMutate = vi.fn();
let mockRole: "admin" | "super_admin" = "admin";
let storeState = {
  isAuthenticated: false,
  isLoading: false,
  operator: null as { role: "admin" | "super_admin" } | null,
};

vi.mock("@/hooks/useOperatorAuth", () => ({
  useOperatorLogin: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@/stores/useOperatorStore", () => ({
  useOperatorStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/login"]}>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<div>Tenant admin home</div>} />
        <Route path="/admin/global" element={<div>Global admin home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = "admin";
    storeState = {
      isAuthenticated: false,
      isLoading: false,
      operator: null,
    };

    mockMutate.mockImplementation((_values, options?: { onSuccess?: (operator: { role: "admin" | "super_admin" }) => void }) => {
      options?.onSuccess?.({ role: mockRole });
    });
  });

  it("redirects tenant admins to the tenant dashboard after login", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "admin@demo.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Tenant admin home")).toBeInTheDocument();
  });

  it("redirects super-admins to the global dashboard after login", async () => {
    mockRole = "super_admin";
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "root@demo.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Global admin home")).toBeInTheDocument();
  });
});
