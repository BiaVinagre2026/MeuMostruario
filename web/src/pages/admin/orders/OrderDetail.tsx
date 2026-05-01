import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { getOrder, updateOrderStatus } from "@/lib/api/orders";
import type { OrderStatus } from "@/types/order";

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

const ALL_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "cancelled",
];

function brl(value: string): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orderId = Number(id);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", orderId],
    queryFn: () => getOrder(orderId),
    enabled: !Number.isNaN(orderId),
  });

  const order = data?.order;

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");

  const mutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(orderId, status),
    onSuccess: (res) => {
      toast.success("Status atualizado com sucesso.");
      setSelectedStatus("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.setQueryData(["admin", "orders", orderId], res);
    },
    onError: () => {
      toast.error("Erro ao atualizar o status.");
    },
  });

  function handleSaveStatus() {
    if (selectedStatus) {
      mutation.mutate(selectedStatus);
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center flex-1 py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center flex-1 py-32 text-center">
          <p className="font-medium">Pedido não encontrado</p>
          <Button variant="link" onClick={() => navigate("/admin/orders")}>
            Voltar para pedidos
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const itemsTotal = order.items.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0
  );

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/orders")}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Pedido #{order.id}</h1>
          <span
            className={[
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              STATUS_COLORS[order.status],
            ].join(" ")}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Lojista */}
          <div className="border rounded-lg p-4 space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Lojista
            </h2>
            {order.member ? (
              <>
                <p className="font-medium">{order.member.full_name}</p>
                <p className="text-sm text-muted-foreground">{order.member.email}</p>
                {order.member.phone && (
                  <p className="text-sm text-muted-foreground">{order.member.phone}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Não informado</p>
            )}
          </div>

          {/* Card Resumo */}
          <div className="border rounded-lg p-4 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Resumo
            </h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total de peças</span>
              <span className="font-medium">{order.total_units}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-medium font-mono">{brl(order.total_value)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data do pedido</span>
              <span className="font-medium">{formatDate(order.created_at)}</span>
            </div>
            {order.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabela de itens */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Itens do pedido
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produto</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cor</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tam.</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qtd</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Preço unit.</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-4 py-2.5 font-medium">{item.product_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {item.product_sku ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {item.color ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {item.size ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{item.qty}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">
                      {brl(item.unit_price)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-medium">
                      {brl(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                    {brl(String(itemsTotal))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Card atualizar status */}
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Atualizar status
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as OrderStatus | "")}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Selecionar novo status...</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <Button
              onClick={handleSaveStatus}
              disabled={!selectedStatus || mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
