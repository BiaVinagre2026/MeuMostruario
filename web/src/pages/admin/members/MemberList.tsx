import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, UserCheck, UserX, X } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMember, getMembers, updateMember, updateMemberStatus, type AdminMember, type AdminMemberDetail } from "@/lib/api/members";

const STATUS_TABS = [
  { label: "Todos",     value: "" },
  { label: "Ativos",    value: "active" },
  { label: "Bloqueados", value: "blocked" },
  { label: "Inativos",  value: "inactive" },
];

const STATUS_LABELS: Record<string, string> = {
  active:   "Ativo",
  blocked:  "Bloqueado",
  inactive: "Inativo",
};

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-800",
  blocked:  "bg-red-100 text-red-800",
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
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

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
                      <tr
                        key={m.id}
                        className={[
                          idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                          "cursor-pointer hover:bg-muted/40 transition-colors",
                        ].join(" ")}
                        onClick={() => setEditingMemberId(m.id)}
                      >
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
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={(e) => { e.stopPropagation(); setEditingMemberId(m.id); }}
                              title="Editar lojista">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {m.status !== "active" && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                                disabled={statusMutation.isPending}
                                onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: m.id, status: "active" }); }}
                                title="Aprovar lojista">
                                <UserCheck className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {m.status !== "inactive" && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                disabled={statusMutation.isPending}
                                onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: m.id, status: "inactive" }); }}
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

      {editingMemberId && (
        <MemberEditDrawer
          memberId={editingMemberId}
          onClose={() => setEditingMemberId(null)}
          onSaved={() => {
            setEditingMemberId(null);
            void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
          }}
        />
      )}
    </AdminLayout>
  );
}

function MemberEditDrawer({
  memberId,
  onClose,
  onSaved,
}: {
  memberId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Partial<AdminMemberDetail>>({});

  const { data: member, isLoading } = useQuery({
    queryKey: ["admin", "members", memberId],
    queryFn: () => getMember(memberId),
  });

  useEffect(() => {
    if (!member) return;
    setDraft({
      full_name: member.full_name,
      email: member.email,
      phone: member.phone,
      status: member.status,
      plan_status: member.plan_status,
      plan_category: member.plan_category,
      birthdate: member.birthdate,
      gender: member.gender,
      association_date: member.association_date,
      last_payment_date: member.last_payment_date,
    });
  }, [member]);

  const mutation = useMutation({
    mutationFn: () => updateMember(memberId, draft),
    onSuccess: () => {
      toast.success("Lojista atualizado.");
      onSaved();
    },
    onError: () => toast.error("Erro ao atualizar lojista."),
  });

  const set = (key: keyof AdminMemberDetail) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value || null }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <aside
        className="w-full max-w-xl h-full bg-background shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base">Editar lojista</h2>
            <p className="text-xs text-muted-foreground">{member?.cpf ? `CPF ${member.cpf}` : "Dados cadastrais"}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded-md" />)}
          </div>
        ) : (
          <>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
              <Field label="Nome completo" className="md:col-span-2">
                <Input value={draft.full_name ?? ""} onChange={(e) => set("full_name")(e.target.value)} />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={draft.email ?? ""} onChange={(e) => set("email")(e.target.value)} />
              </Field>
              <Field label="Telefone">
                <Input value={draft.phone ?? ""} onChange={(e) => set("phone")(e.target.value)} />
              </Field>
              <Field label="Status">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={draft.status ?? "active"} onChange={(e) => set("status")(e.target.value)}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </Field>
              <Field label="Status do plano">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={draft.plan_status ?? "active"} onChange={(e) => set("plan_status")(e.target.value)}>
                  <option value="active">Ativo</option>
                  <option value="overdue">Em atraso</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </Field>
              <Field label="Categoria do plano">
                <Input value={draft.plan_category ?? ""} onChange={(e) => set("plan_category")(e.target.value)} />
              </Field>
              <Field label="Gênero">
                <Input value={draft.gender ?? ""} onChange={(e) => set("gender")(e.target.value)} />
              </Field>
              <Field label="Nascimento">
                <Input type="date" value={dateValue(draft.birthdate)} onChange={(e) => set("birthdate")(e.target.value)} />
              </Field>
              <Field label="Associação">
                <Input type="date" value={dateValue(draft.association_date)} onChange={(e) => set("association_date")(e.target.value)} />
              </Field>
              <Field label="Último pagamento">
                <Input type="date" value={dateValue(draft.last_payment_date)} onChange={(e) => set("last_payment_date")(e.target.value)} />
              </Field>
            </div>

            <div className="mt-auto px-5 py-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={["flex flex-col gap-1.5", className].join(" ")}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
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
