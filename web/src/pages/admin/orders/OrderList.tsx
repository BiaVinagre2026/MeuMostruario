import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { getOrders } from "@/lib/api/orders";
import type { OrderStatus } from "@/types/order";

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "Todos", value: "" },
  { label: "Pendente", value: "pending" },
  { label: "Confirmado", value: "confirmed" },
  { label: "Em preparo", value: "processing" },
  { label: "Enviado", value: "shipped" },
  { label: "Cancelado", value: "cancelled" },
];

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

function brl(value: string): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const PER_PAGE = 20;

export default function OrderList() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "orders", { page, status: statusFilter }],
    queryFn: () =>
      getOrders({
        page,
        per_page: PER_PAGE,
        status: statusFilter || undefined,
      }),
  });

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const orders = data?.orders ?? [];
  const total = data?.meta.total_count ?? 0;
  const totalPages = data?.meta.total_pages ?? 1;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b">
        <div>
          <h1 className="text-base md:text-lg font-semibold">Pedidos do atacado</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {total > 0 ? `${total} pedido${total !== 1 ? "s" : ""}` : "Nenhum pedido"}
          </p>
        </div>
      </div>

      <div className="px-4 md:px-6 pt-3 pb-2 overflow-x-auto">
        <div className="flex gap-1 whitespace-nowrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={[
                "px-2.5 py-1.5 text-xs md:text-sm rounded-md transition-colors font-medium flex-shrink-0",
                statusFilter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-6 pb-6 flex-1">
        {isLoading ? (
          <OrderTableSkeleton />
        ) : orders.length === 0 ? (
          <div className="border rounded-md flex flex-col items-center justify-center py-20 text-center">
            <p className="font-medium">Nenhum pedido encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter ? "Tente selecionar outro status." : "Os pedidos aparecerão aqui quando forem criados."}
            </p>
          </div>
        ) : (
          <>
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-14">#</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Comprador</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Peças</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Data</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground w-16">Ver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, idx) => (
                      <tr
                        key={order.id}
                        className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          #{order.id}
                        </td>
                        <td className="px-4 py-2.5">
                          {order.member ? (
                            <div>
                              <p className="font-medium text-xs md:text-sm">{order.member.full_name}</p>
                              <p className="text-xs text-muted-foreground hidden sm:block">{order.member.email}</p>
                              <span className={["sm:hidden inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-1", STATUS_COLORS[order.status]].join(" ")}>
                                {STATUS_LABELS[order.status]}
                              </span>
                            </div>
                          ) : (
                            <span className="italic text-muted-foreground/60 text-xs">Pedido por link</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs hidden sm:table-cell">
                          {order.total_units}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {brl(order.total_value)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span
                            className={[
                              "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium",
                              STATUS_COLORS[order.status],
                            ].join(" ")}
                          >
                            {STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => navigate(`/admin/orders/${order.id}`)}
                          >
                            Ver
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function OrderTableSkeleton() {
  return (
    <div className="border rounded-md overflow-hidden animate-pulse">
      <div className="bg-muted/50 px-4 py-3 h-10" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-t">
          <div className="h-3 bg-muted rounded w-8" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-40" />
          </div>
          <div className="h-3 bg-muted rounded w-8" />
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-5 bg-muted rounded w-16" />
          <div className="h-7 bg-muted rounded w-12" />
        </div>
      ))}
    </div>
  );
}
