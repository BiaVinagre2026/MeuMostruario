import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PauseCircle, PlayCircle, Plus } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { useOperatorStore } from "@/stores/useOperatorStore";
import type { AdminTenant, TenantPlan } from "@/types/operator";

interface TenantListResponse {
  tenants: AdminTenant[];
}

interface TenantPayload {
  tenant: {
    name: string;
    slug: string;
    plan: TenantPlan;
    custom_domain: string | null;
  };
}

const PLAN_OPTIONS: TenantPlan[] = ["starter", "growth", "enterprise"];

export default function TenantListPage() {
  const operator = useOperatorStore((state) => state.operator);
  const isSuperAdmin = operator?.role === "super_admin";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    plan: "growth" as TenantPlan,
    custom_domain: "",
  });

  const { data, isLoading } = useQuery<TenantListResponse>({
    queryKey: ["admin", "global", "tenants"],
    queryFn: () => apiClient.get<TenantListResponse>("/api/v1/admin/tenants"),
    enabled: isSuperAdmin,
  });

  const createTenant = useMutation({
    mutationFn: (payload: TenantPayload) => apiClient.post<{ tenant: AdminTenant }>("/api/v1/admin/tenants", payload),
    onSuccess: () => {
      toast.success("Tenant criado com sucesso.");
      setForm({ name: "", slug: "", plan: "growth", custom_domain: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin", "global", "tenants"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível criar o tenant.");
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "suspended" }) =>
      apiClient.patch<{ tenant: AdminTenant }>(`/api/v1/admin/tenants/${id}`, { tenant: { status } }),
    onSuccess: (_, variables) => {
      toast.success(variables.status === "active" ? "Tenant reativado." : "Tenant suspenso.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "global", "tenants"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível atualizar o status.");
    },
  });

  if (!isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const tenants = data?.tenants ?? [];
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => a.name.localeCompare(b.name)), [tenants]);

  function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTenant.mutate({
      tenant: {
        name: form.name.trim(),
        slug: form.slug.trim(),
        plan: form.plan,
        custom_domain: form.custom_domain.trim() || null,
      },
    });
  }

  return (
    <AdminLayout>
      <div className="px-4 md:px-6 py-3 md:py-4 border-b">
        <h1 className="text-base md:text-lg font-semibold">Tenants</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Cadastre e administre operações white-label independentes</p>
      </div>

      <div className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto space-y-4 md:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Novo tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tenant-name">Nome</Label>
                <Input
                  id="tenant-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Marca Aurora"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-slug">Slug</Label>
                <Input
                  id="tenant-slug"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                  placeholder="marca-aurora"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-plan">Plano</Label>
                <select
                  id="tenant-plan"
                  value={form.plan}
                  onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value as TenantPlan }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PLAN_OPTIONS.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="tenant-domain">Domínio customizado</Label>
                <Input
                  id="tenant-domain"
                  value={form.custom_domain}
                  onChange={(event) => setForm((current) => ({ ...current, custom_domain: event.target.value }))}
                  placeholder="catalogo.marcaaurora.com.br"
                />
              </div>
              <div className="md:col-span-1 flex items-end">
                <Button type="submit" className="w-full" disabled={createTenant.isPending}>
                  {createTenant.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Criar tenant
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Operações cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando tenants...
              </div>
            ) : sortedTenants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum tenant cadastrado.</p>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm min-w-[760px]">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plano</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Domínio</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Schema</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTenants.map((tenant, index) => {
                      const isActive = tenant.status === "active";
                      return (
                        <tr key={tenant.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="px-4 py-3 font-medium">{tenant.name}</td>
                          <td className="px-4 py-3 font-mono text-xs">{tenant.slug}</td>
                          <td className="px-4 py-3 uppercase text-xs tracking-wide">{tenant.plan}</td>
                          <td className="px-4 py-3">
                            <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", isActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"].join(" ")}>
                              {tenant.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{tenant.custom_domain || "-"}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tenant.schema_name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {isActive ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={changeStatus.isPending}
                                  onClick={() => changeStatus.mutate({ id: tenant.id, status: "suspended" })}
                                >
                                  <PauseCircle className="mr-2 h-4 w-4" />
                                  Suspender
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  disabled={changeStatus.isPending}
                                  onClick={() => changeStatus.mutate({ id: tenant.id, status: "active" })}
                                >
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  Reativar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
