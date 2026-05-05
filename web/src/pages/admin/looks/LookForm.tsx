import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, ArrowLeft, X, Search, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAdminLook, createAdminLook, updateAdminLook, type LookPayload,
} from "@/lib/api/looks";
import { getCollections } from "@/lib/api/collections";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";

interface ProductOption {
  id: number;
  name: string;
  sku: string;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start gap-2 md:gap-4">
      <div className="md:pt-2">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function LookForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // form state
  const [name,         setName]         = useState("");
  const [description,  setDescription]  = useState("");
  const [coverUrl,     setCoverUrl]     = useState("");
  const [status,       setStatus]       = useState<"draft" | "published" | "archived">("draft");
  const [position,     setPosition]     = useState("1");
  const [collectionId, setCollectionId] = useState<number | "">("");
  const [selectedIds,  setSelectedIds]  = useState<number[]>([]);

  // product search
  const [search,   setSearch]   = useState("");
  const [options,  setOptions]  = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: collections = [] } = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: getCollections,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin", "looks", id],
    queryFn: () => getAdminLook(Number(id)),
    enabled: isEdit,
  });

  // Seed all available products for quick selection
  const { data: allProducts = [] } = useQuery<ProductOption[]>({
    queryKey: ["admin", "products-options"],
    queryFn: async () => {
      const res = await apiClient.get<{ products: ProductOption[] }>("/api/v1/admin/products?per_page=200");
      return res.products;
    },
  });

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDescription(existing.description ?? "");
    setCoverUrl(existing.cover_url ?? "");
    setStatus(existing.status);
    setPosition(String(existing.position));
    setCollectionId(existing.collection?.id ?? "");
    setSelectedIds((existing.products ?? []).map(p => p.id));
  }, [existing]);

  // Live product search
  useEffect(() => {
    if (!search.trim()) { setOptions([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ products: ProductOption[] }>(
          `/api/v1/admin/products?q=${encodeURIComponent(search)}&per_page=20`
        );
        setOptions(res.products.filter(p => !selectedIds.includes(p.id)));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedIds]);

  const saveMutation = useMutation({
    mutationFn: (payload: LookPayload) =>
      isEdit ? updateAdminLook(Number(id), payload) : createAdminLook(payload),
    onSuccess: () => {
      toast.success(isEdit ? "Look atualizado." : "Look criado.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "looks"] });
      navigate("/admin/looks");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar look."),
  });

  function handleSave() {
    if (!name.trim()) { toast.error("Nome é obrigatório."); return; }
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      cover_url: coverUrl.trim() || undefined,
      status,
      position: parseInt(position, 10) || 1,
      collection_id: collectionId === "" ? null : Number(collectionId),
      product_ids: selectedIds,
    });
  }

  function addProduct(p: ProductOption) {
    setSelectedIds(ids => [...ids, p.id]);
    setSearch("");
    setOptions([]);
  }

  function removeProduct(pid: number) {
    setSelectedIds(ids => ids.filter(i => i !== pid));
  }

  // Map selected IDs to product names (merge allProducts + existing.products for offline names)
  const productPool: ProductOption[] = [
    ...allProducts,
    ...(existing?.products ?? []),
  ];
  const selectedProducts = selectedIds
    .map(sid => productPool.find(p => p.id === sid))
    .filter(Boolean) as ProductOption[];

  if (isEdit && loadingExisting) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center flex-1 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/admin/looks")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base md:text-lg font-semibold">{isEdit ? "Editar Look" : "Novo Look"}</h1>
            <p className="text-xs text-muted-foreground">{isEdit ? existing?.name : "Crie um novo look"}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending
            ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            : <Save className="h-4 w-4 mr-1.5" />}
          Salvar
        </Button>
      </div>

      <div className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto">
        <div className="max-w-2xl space-y-5">

          {/* Basic info */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-5 py-3 bg-muted/40 border-b">
              <h2 className="font-medium text-sm">Informações básicas</h2>
            </div>
            <div className="px-5 py-5 space-y-4">
              <Field label="Nome">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do look" />
              </Field>

              <Field label="Descrição">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descrição breve do look..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground resize-none"
                />
              </Field>

              <Field label="URL da capa" hint="Link direto para a imagem de capa">
                <Input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
              </Field>

              <Field label="Coleção">
                <select
                  value={collectionId}
                  onChange={e => setCollectionId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Sem coleção</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <div className="flex gap-2 flex-wrap">
                  {(["draft", "published", "archived"] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={[
                        "px-3 py-1.5 rounded-md border text-xs font-medium transition-colors",
                        status === s
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-input text-muted-foreground hover:bg-accent",
                      ].join(" ")}
                    >
                      {{ draft: "Rascunho", published: "Publicado", archived: "Arquivado" }[s]}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Posição" hint="Ordem de exibição">
                <Input
                  type="number"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="w-24"
                  min={1}
                />
              </Field>
            </div>
          </div>

          {/* Products */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-5 py-3 bg-muted/40 border-b">
              <h2 className="font-medium text-sm">Produtos do look</h2>
            </div>
            <div className="px-5 py-5 space-y-3">

              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar produto por nome ou SKU..."
                  className="pl-9"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results */}
              {options.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  {options.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex items-center justify-between w-full px-3 py-2.5 text-sm hover:bg-accent border-b last:border-b-0 text-left"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground font-mono ml-2">{p.sku}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected products */}
              {selectedProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhum produto adicionado ainda.</p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  {selectedProducts.map((p, idx) => (
                    <div
                      key={p.id}
                      className={[
                        "flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                      ].join(" ")}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground font-mono hidden sm:block">{p.sku}</span>
                      <button
                        type="button"
                        onClick={() => removeProduct(p.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedProducts.length} produto{selectedProducts.length !== 1 ? "s" : ""} selecionado{selectedProducts.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
