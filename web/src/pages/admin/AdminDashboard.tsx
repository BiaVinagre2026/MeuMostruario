import { useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Package, ShoppingBag, Users, TrendingUp, ArrowRight, Loader2 } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { useOperatorStore } from "@/stores/useOperatorStore";
import { apiClient } from "@/lib/api/client";
import type { OrderListResponse, OrderStatus } from "@/types/order";

function brl(value: string | number): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  processing: "Em preparo",
  shipped: "Enviado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const operator = useOperatorStore((state) => state.operator);
  const activeTenantSlug = useOperatorStore((state) => state.activeTenantSlug);
  const isSuperAdmin = operator?.role === "super_admin";
  const hasTenantContext = !isSuperAdmin || Boolean(activeTenantSlug);

  const { data: productsData } = useQuery({
    queryKey: ["admin", "dashboard-products"],
    queryFn: () => apiClient.get<{ meta: { total_count: number } }>("/api/v1/admin/products?per_page=1"),
    enabled: hasTenantContext,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<OrderListResponse>({
    queryKey: ["admin", "dashboard-orders"],
    queryFn: () => apiClient.get<OrderListResponse>("/api/v1/admin/orders?per_page=5"),
    enabled: hasTenantContext,
  });

  const { data: membersData } = useQuery({
    queryKey: ["admin", "dashboard-members"],
    queryFn: () => apiClient.get<{ meta: { total_count: number } }>("/api/v1/admin/members?per_page=1"),
    enabled: hasTenantContext,
  });

  if (isSuperAdmin && !activeTenantSlug) {
    return <Navigate to="/admin/global" replace />;
  }

  const totalProducts = productsData?.meta?.total_count ?? 0;
  const totalOrders = ordersData?.meta?.total_count ?? 0;
  const totalMembers = membersData?.meta?.total_count ?? 0;
  const recentOrders = ordersData?.orders ?? [];
  const totalRevenue = recentOrders.reduce((acc, order) => acc + Number(order.total_value), 0);

  const stats = [
    {
      label: "Produtos do tenant",
      value: totalProducts,
      icon: <Package className="h-5 w-5" />,
      href: "/admin/products",
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Pedidos",
      value: totalOrders,
      icon: <ShoppingBag className="h-5 w-5" />,
      href: "/admin/orders",
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Compradores B2B",
      value: totalMembers,
      icon: <Users className="h-5 w-5" />,
      href: "/admin/members",
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Receita (últimos 5 pedidos)",
      value: brl(totalRevenue),
      icon: <TrendingUp className="h-5 w-5" />,
      href: "/admin/orders",
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <AdminLayout>
      <div className="px-4 md:px-6 py-3 md:py-4 border-b">
        <h1 className="text-base md:text-lg font-semibold">
          Olá, {operator?.name?.split(" ")[0]} <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5" />
          Visão geral da operação {activeTenantSlug ? `· ${activeTenantSlug}` : "atual"}
        </p>
      </div>

      <div className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {stats.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.href)}
              className="flex flex-col gap-3 p-4 border rounded-lg bg-background hover:bg-muted/40 transition-colors text-left"
            >
              <div className={["w-9 h-9 rounded-lg flex items-center justify-center", item.color].join(" ")}>
                {item.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                <p className="text-xl font-semibold tabular-nums">{item.value}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 bg-muted/40 border-b">
            <h2 className="font-medium text-sm">Pedidos recentes</h2>
            <button
              onClick={() => navigate("/admin/orders")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum pedido ainda. Os pedidos desta operação aparecerão aqui.
            </div>
          ) : (
            <div className="divide-y">
              {recentOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  className="w-full flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">#{order.id}</span>
                      <span className="font-medium text-sm truncate">{order.member?.full_name ?? "Pedido por link"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {order.total_units} peças · {formatDate(order.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={["hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[order.status]].join(" ")}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className="font-mono text-sm font-medium">{brl(order.total_value)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 md:px-5 py-3 bg-muted/40 border-b">
            <h2 className="font-medium text-sm">Atalhos</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0">
            {[
              { label: "Novo produto", href: "/admin/products/new" },
              { label: "Novo lote", href: "/admin/photo-batches" },
              { label: "Catálogos", href: "/admin/catalogs" },
              { label: "Configurações", href: "/admin/settings" },
            ].map((shortcut) => (
              <button
                key={shortcut.label}
                onClick={() => navigate(shortcut.href)}
                className="flex items-center justify-between px-4 py-3.5 text-sm hover:bg-muted/30 transition-colors text-left"
              >
                {shortcut.label}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
