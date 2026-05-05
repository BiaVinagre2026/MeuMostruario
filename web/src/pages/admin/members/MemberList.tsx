import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMembers, updateMemberStatus, type AdminMember } from "@/lib/api/members";

const STATUS_TABS = [
  { label: "Todos",     value: "" },
  { label: "Ativos",    value: "active" },
  { label: "Pendentes", value: "pending" },
  { label: "Inativos",  value: "inactive" },
];

const STATUS_LABELS: Record<string, string> = {
  active:   "Ativo",
  pending:  "Pendente",
  inactive: "Inativo",
};

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-800",
  pending:  "bg-yellow-100 text-yellow-800",
  inactive: "bg-gray-100 text-gray-600",
};

const PER_PAGE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function MemberList() {
  const queryClient = useQueryClient();
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [debouncedQ, setDebouncedQ]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "members", page, debouncedQ, statusFilter],
    queryFn: () => getMembers({ page, per_page: PER_PAGE, q: debouncedQ || undefined, status: statusFilter || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateMemberStatus(id, status),
    onSuccess: () => {
      toast.success("Status atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    },
    onError: () => toast.error("Erro ao atualizar status."),
  });

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const members    = data?.members ?? [];
  const total      = data?.meta.total_count ?? 0;
  const totalPages = data?.meta.total_pages ?? 1;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b">
        <div>
          <h1 className="text-base md:text-lg font-semibold">Lojistas</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {total > 0 ? `${total} lojista${total !== 1 ? "s" : ""}` : "Nenhum lojista"}
          </p>
        </div>
      </div>

      <div className="px-4 md:px-6 pt-3 pb-2 space-y-2">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={[
                "px-2.5 py-1 text-xs md:text-sm rounded-md transition-colors font-medium whitespace-nowrap flex-shrink-0",
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
          <Skeleton />
        ) : members.length === 0 ? (
          <div className="border rounded-md flex flex-col items-center justify-center py-20 text-center">
            <p className="font-medium">Nenhum lojista encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter ? "Tente selecionar outro status." : "Os lojistas aparecerão aqui após o cadastro."}
            </p>
          </div>
        ) : (
          <>
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">E-mail</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Telefone</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Cadastro</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, idx) => (
                      <tr key={m.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-xs md:text-sm">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{m.email}</p>
                          <span className={["sm:hidden inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-1", STATUS_COLORS[m.status] ?? "bg-gray-100 text-gray-600"].join(" ")}>
                            {STATUS_LABELS[m.status] ?? m.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{m.email}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{m.phone ?? "—"}</td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span className={["inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[m.status] ?? "bg-gray-100 text-gray-600"].join(" ")}>
                            {STATUS_LABELS[m.status] ?? m.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                          {formatDate(m.created_at)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {m.status !== "active" && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                                disabled={statusMutation.isPending}
                                onClick={() => statusMutation.mutate({ id: m.id, status: "active" })}
                                title="Aprovar lojista">
                                <UserCheck className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {m.status !== "inactive" && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                disabled={statusMutation.isPending}
                                onClick={() => statusMutation.mutate({ id: m.id, status: "inactive" })}
                                title="Desativar lojista">
                                <UserX className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                    disabled={page <= 1 || isFetching} onClick={() => setPage((p) => p - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                    disabled={page >= totalPages || isFetching} onClick={() => setPage((p) => p + 1)}>
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

function Skeleton() {
  return (
    <div className="border rounded-md overflow-hidden animate-pulse">
      <div className="bg-muted/50 px-4 py-3 h-10" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-t">
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-40" />
          </div>
          <div className="h-5 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-20 hidden md:block" />
        </div>
      ))}
    </div>
  );
}
