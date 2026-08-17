import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Globe2, ShieldCheck, Store } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { useOperatorStore } from "@/stores/useOperatorStore";
import type { AdminTenant } from "@/types/operator";

interface TenantListResponse {
  tenants: AdminTenant[];
}

export default function GlobalDashboard() {
  const navigate = useNavigate();
  const operator = useOperatorStore((state) => state.operator);
  const isSuperAdmin = operator?.role === "super_admin";

  const { data, isLoading } = useQuery<TenantListResponse>({
    queryKey: ["admin", "global", "tenants"],
    queryFn: () => apiClient.get<TenantListResponse>("/api/v1/admin/tenants"),
    enabled: isSuperAdmin,
  });

  // Os hooks precisam vir antes de qualquer retorno: o operador chega de forma
  // assincrona, entao isSuperAdmin muda entre renders e a ordem dos hooks nao
  // pode depender dele.
  const tenants = useMemo(() => data?.tenants ?? [], [data]);
  const totals = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.status === "active").length;
    const suspended = tenants.filter((tenant) => tenant.status === "suspended").length;
    const enterprise = tenants.filter((tenant) => tenant.plan === "enterprise").length;
    return {
      total: tenants.length,
      active,
      suspended,
      enterprise,
    };
  }, [tenants]);

  if (!isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const recentTenants = [...tenants]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 5);

  return (
    <AdminLayout>
      <div className="px-4 md:px-6 py-3 md:py-4 border-b">
        <h1 className="text-base md:text-lg font-semibold">Painel global</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Gestão white-label dos tenants e da operação multitenant
        </p>
      </div>

      <div className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: "Tenants", value: totals.total, icon: <Building2 className="h-5 w-5" />, tone: "text-blue-600 bg-blue-50" },
            { label: "Ativos", value: totals.active, icon: <ShieldCheck className="h-5 w-5" />, tone: "text-emerald-600 bg-emerald-50" },
            { label: "Suspensos", value: totals.suspended, icon: <Store className="h-5 w-5" />, tone: "text-amber-600 bg-amber-50" },
            { label: "Enterprise", value: totals.enterprise, icon: <Globe2 className="h-5 w-5" />, tone: "text-purple-600 bg-purple-50" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className={["w-9 h-9 rounded-lg flex items-center justify-center", item.tone].join(" ")}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-semibold tabular-nums">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-[1.3fr,0.7fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Tenants recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/global/tenants")}>
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando tenants...</p>
              ) : recentTenants.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum tenant cadastrado ainda.</p>
              ) : (
                <div className="divide-y rounded-md border">
                  {recentTenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between px-4 py-3 gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tenant.slug} · {tenant.schema_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium uppercase tracking-wide">{tenant.plan}</p>
                        <p className="text-xs text-muted-foreground">{tenant.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Próximos passos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Criar tenants para marcas, fábricas ou operações separadas.</p>
              <p>2. Configurar branding, catálogo e links dentro de cada tenant.</p>
              <p>3. Operar pedidos e pagamentos de forma isolada por tenant.</p>
              <Button className="w-full" onClick={() => navigate("/admin/global/tenants")}>
                Gerenciar tenants
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
