import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, ImageOff, Layers } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { getAdminLooks, deleteAdminLook, type AdminLook } from "@/lib/api/looks";

const STATUS_LABELS = { draft: "Rascunho", published: "Publicado", archived: "Arquivado" };
const STATUS_COLORS = {
  draft:     "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived:  "bg-gray-100 text-gray-600",
};

export default function LookList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<AdminLook | null>(null);

  const { data: looks = [], isLoading } = useQuery({
    queryKey: ["admin", "looks"],
    queryFn: getAdminLooks,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminLook(id),
    onSuccess: () => {
      toast.success("Look excluído.");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "looks"] });
    },
    onError: () => toast.error("Erro ao excluir look."),
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b gap-3">
        <div>
          <h1 className="text-base md:text-lg font-semibold">Looks</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {looks.length > 0 ? `${looks.length} look${looks.length !== 1 ? "s" : ""}` : "Nenhum look"}
          </p>
        </div>
        <Button onClick={() => navigate("/admin/looks/new")} size="sm" className="md:size-auto">
          <Plus className="h-4 w-4 mr-1.5" />
          <span className="hidden md:inline">Novo Look</span>
          <span className="md:hidden">Novo</span>
        </Button>
      </div>

      <div className="px-4 md:px-6 py-4 md:py-6 flex-1">
        {isLoading ? (
          <Skeleton />
        ) : looks.length === 0 ? (
          <EmptyState onNew={() => navigate("/admin/looks/new")} />
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-14">Capa</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Coleção</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Peças</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-20">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {looks.map((look, idx) => (
                    <tr key={look.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-4 py-2.5">
                        <div className="w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                          {look.cover_url ? (
                            <img src={look.cover_url} alt={look.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{look.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={["inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[look.status]].join(" ")}>
                          {STATUS_LABELS[look.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                        {look.collection?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                        {look.product_count}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={() => navigate(`/admin/looks/${look.id}/edit`)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(look)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteDialog
          look={deleteTarget}
          isDeleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}

function Skeleton() {
  return (
    <div className="border rounded-md overflow-hidden animate-pulse">
      <div className="bg-muted/50 px-4 py-3 h-10" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-t">
          <div className="w-10 h-10 rounded bg-muted" />
          <div className="flex-1 h-3.5 bg-muted rounded w-32" />
          <div className="h-5 bg-muted rounded w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="border rounded-md flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Layers className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium">Nenhum look cadastrado</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Crie looks combinando produtos do catálogo.
      </p>
      <Button onClick={onNew}>
        <Plus className="h-4 w-4 mr-1.5" />
        Novo Look
      </Button>
    </div>
  );
}

function DeleteDialog({ look, isDeleting, onConfirm, onCancel }: {
  look: AdminLook;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-base mb-1">Excluir look?</h2>
        <p className="text-sm text-muted-foreground mb-5">
          <strong className="text-foreground">{look.name}</strong> será excluído permanentemente.
          Os produtos vinculados não serão excluídos.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
