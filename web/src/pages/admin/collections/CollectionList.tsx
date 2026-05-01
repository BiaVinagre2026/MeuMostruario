import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, ImageOff } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { getCollections, deleteCollection } from "@/lib/api/collections";
import type { Collection, CollectionStatus } from "@/types/product";

const STATUS_LABELS: Record<CollectionStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  archived: "Arquivada",
};

const STATUS_COLORS: Record<CollectionStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
};

export default function CollectionList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: getCollections,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCollection(id),
    onSuccess: () => {
      toast.success("Coleção excluída.");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "collections"] });
    },
    onError: () => toast.error("Erro ao excluir coleção."),
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-lg font-semibold">Coleções</h1>
          <p className="text-sm text-muted-foreground">
            {collections.length > 0
              ? `${collections.length} coleção${collections.length !== 1 ? "ções" : ""}`
              : "Nenhuma coleção"}
          </p>
        </div>
        <Button onClick={() => navigate("/admin/collections/new")}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Coleção
        </Button>
      </div>

      <div className="px-6 py-6 flex-1">
        {isLoading ? (
          <CollectionTableSkeleton />
        ) : collections.length === 0 ? (
          <EmptyState onNew={() => navigate("/admin/collections/new")} />
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-14">
                    Capa
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Posição
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Produtos
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection, idx) => (
                  <tr
                    key={collection.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        {collection.cover_url ? (
                          <img
                            src={collection.cover_url}
                            alt={collection.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{collection.name}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={[
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          STATUS_COLORS[collection.status],
                        ].join(" ")}
                      >
                        {STATUS_LABELS[collection.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{collection.position}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {collection.products_count}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/admin/collections/${collection.id}/edit`)
                          }
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(collection)}
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
        )}
      </div>

      {/* Delete dialog */}
      {deleteTarget && (
        <DeleteDialog
          collection={deleteTarget}
          isDeleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}

function CollectionTableSkeleton() {
  return (
    <div className="border rounded-md overflow-hidden animate-pulse">
      <div className="bg-muted/50 px-4 py-3 h-10" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-t">
          <div className="w-10 h-10 rounded bg-muted" />
          <div className="flex-1 h-3.5 bg-muted rounded w-32" />
          <div className="h-5 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-8" />
          <div className="h-3 bg-muted rounded w-8" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="border rounded-md flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
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
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
          />
        </svg>
      </div>
      <h3 className="font-medium">Nenhuma coleção cadastrada</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Organize seus produtos em coleções.
      </p>
      <Button onClick={onNew}>
        <Plus className="h-4 w-4 mr-1.5" />
        Nova Coleção
      </Button>
    </div>
  );
}

function DeleteDialog({
  collection,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  collection: Collection;
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
        <h2 className="font-semibold text-base mb-1">Excluir coleção?</h2>
        <p className="text-sm text-muted-foreground mb-5">
          <strong className="text-foreground">{collection.name}</strong> será excluída
          permanentemente. Os produtos vinculados não serão excluídos.
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
