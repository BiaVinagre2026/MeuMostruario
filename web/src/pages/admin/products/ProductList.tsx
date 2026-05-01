import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, ImageOff, Search, Archive, PackageX } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProducts, deleteProduct, updateProduct } from "@/lib/api/products";
import type { ProductListItem, ProductStatus } from "@/types/product";

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "Todos", value: "" },
  { label: "Rascunho", value: "draft" },
  { label: "Publicado", value: "published" },
  { label: "Arquivado", value: "archived" },
  { label: "Esgotado", value: "sold_out" },
];

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
  sold_out: "Esgotado",
};

const STATUS_COLORS: Record<ProductStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
  sold_out: "bg-red-100 text-red-700",
};

const PER_PAGE = 20;

function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function ProductList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "products", page, debouncedSearch, statusFilter],
    queryFn: () =>
      getProducts({
        page,
        per_page: PER_PAGE,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Produto excluído.");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: () => {
      toast.error("Erro ao excluir produto.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ProductStatus }) =>
      updateProduct(id, { status }),
    onSuccess: (_data, variables) => {
      const label = variables.status === "archived" ? "Produto arquivado." : "Produto marcado como esgotado.";
      toast.success(label);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar status do produto.");
    },
  });

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const products = data?.products ?? [];
  const total = data?.meta.total_count ?? 0;
  const totalPages = data?.meta.total_pages ?? 1;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-lg font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} produto${total !== 1 ? "s" : ""}` : "Nenhum produto"}
          </p>
        </div>
        <Button onClick={() => navigate("/admin/products/new")}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Produto
        </Button>
      </div>

      <div className="px-6 pt-4 pb-2 space-y-3">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={[
                "px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
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

      {/* Table */}
      <div className="px-6 pb-6 flex-1">
        {isLoading ? (
          <ProductTableSkeleton />
        ) : products.length === 0 ? (
          <EmptyState onNew={() => navigate("/admin/products/new")} hasFilters={!!debouncedSearch || !!statusFilter} />
        ) : (
          <>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-14">Foto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Coleção</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Preço Atacado</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, idx) => (
                    <tr
                      key={product.id}
                      className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-4 py-2.5">
                        <div className="w-10 h-12 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                          {product.cover_url ? (
                            <img
                              src={product.cover_url}
                              alt={product.name}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium max-w-xs truncate">
                        {product.name}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">
                        {product.sku}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {product.collection?.name ?? <span className="italic text-muted-foreground/60">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={[
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            STATUS_COLORS[product.status],
                          ].join(" ")}
                        >
                          {STATUS_LABELS[product.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {brl(product.price_wholesale)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {product.status !== "archived" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Arquivar produto"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: product.id, status: "archived" })}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {product.status !== "sold_out" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Marcar como esgotado"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: product.id, status: "sold_out" })}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <PackageX className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(product)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
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

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteDialog
          product={deleteTarget}
          isDeleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}

function ProductTableSkeleton() {
  return (
    <div className="border rounded-md overflow-hidden animate-pulse">
      <div className="bg-muted/50 px-4 py-3 h-10" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-t">
          <div className="w-10 h-12 rounded bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-muted rounded w-40" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-5 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  onNew,
  hasFilters,
}: {
  onNew: () => void;
  hasFilters: boolean;
}) {
  return (
    <div className="border rounded-md flex flex-col items-center justify-center py-20 text-center">
      <Package />
      <h3 className="mt-3 font-medium">
        {hasFilters ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        {hasFilters
          ? "Tente ajustar os filtros de busca."
          : "Comece cadastrando seu primeiro produto."}
      </p>
      {!hasFilters && (
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Produto
        </Button>
      )}
    </div>
  );
}

function DeleteDialog({
  product,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  product: ProductListItem;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-base mb-1">Excluir produto?</h2>
        <p className="text-sm text-muted-foreground mb-5">
          <strong className="text-foreground">{product.name}</strong> será excluído permanentemente.
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}

// Needed for the lucide icon in the empty state
function Package() {
  return (
    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>
    </div>
  );
}
