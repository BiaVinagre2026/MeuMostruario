import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bulkUpdatePhotos,
  createCatalog,
  createCatalogLink,
  getPhotoBatch,
} from "@/lib/api/photoCatalog";
import { SIZE_GROUPS, type Photo } from "@/types/photoCatalog";

export default function PhotoBatchReview() {
  const { id } = useParams<{ id: string }>();
  const batchId = Number(id);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [color, setColor] = useState("");
  const [pantone, setPantone] = useState("");
  const [model, setModel] = useState("");
  const [sizeGroup, setSizeGroup] = useState("");
  const [filterSku, setFilterSku] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [groupBy, setGroupBy] = useState<"none" | "sku" | "group">("sku");
  const [lastLinks, setLastLinks] = useState<string[]>([]);

  const { data: batch, isLoading } = useQuery({
    queryKey: ["admin", "photo-batch", batchId],
    queryFn: () => getPhotoBatch(batchId),
    enabled: Number.isFinite(batchId),
  });

  const photos = batch?.photos ?? [];
  const skuOptions = useMemo(
    () => Array.from(new Set(photos.map((photo) => photo.suggested_sku).filter(Boolean))).sort(),
    [photos]
  );
  const groupOptions = useMemo(
    () => Array.from(new Set(photos.map((photo) => photo.suggestion_group).filter(Boolean))).sort(),
    [photos]
  );
  const filteredPhotos = useMemo(
    () =>
      photos.filter((photo) => {
        if (filterSku !== "all" && photo.suggested_sku !== filterSku) return false;
        if (filterGroup !== "all" && photo.suggestion_group !== filterGroup) return false;
        if (filterStatus !== "all" && photo.status !== filterStatus) return false;
        return true;
      }),
    [filterGroup, filterSku, filterStatus, photos]
  );
  const groupedPhotos = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "Todas as fotos", photos: filteredPhotos }];

    const groups = new Map<string, Photo[]>();
    filteredPhotos.forEach((photo) => {
      const key = groupBy === "sku" ? (photo.suggested_sku || "Sem SKU sugerido") : (photo.suggestion_group || "Sem grupo");
      groups.set(key, [...(groups.get(key) ?? []), photo]);
    });

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: key,
      photos: items,
    }));
  }, [filteredPhotos, groupBy]);
  const selectedPhotos = useMemo(() => filteredPhotos.filter((photo) => selected.has(photo.id)), [filteredPhotos, selected]);

  const updatePhotos = useMutation({
    mutationFn: () => bulkUpdatePhotos({
      photo_ids: Array.from(selected),
      approved_color: color || undefined,
      approved_pantone: pantone || undefined,
      approved_model: model || undefined,
      approved_size_group: sizeGroup || undefined,
      status: "approved",
      approve: true,
    }),
    onSuccess: () => {
      toast.success("Fotos atualizadas.");
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ["admin", "photo-batch", batchId] });
    },
    onError: () => toast.error("Nao foi possivel atualizar as fotos."),
  });

  const applySuggestions = useMutation({
    mutationFn: () => bulkUpdatePhotos({
      photo_ids: Array.from(selected),
      apply_suggestions: true,
      approve: true,
    }),
    onSuccess: () => {
      toast.success("Sugestoes aplicadas e fotos aprovadas.");
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ["admin", "photo-batch", batchId] });
    },
    onError: () => toast.error("Nao foi possivel aplicar as sugestoes."),    
  });

  const makeCatalog = useMutation({
    mutationFn: () => createCatalogForPhotos(selectedPhotos, buildCatalogName(`Catalogo ${batch?.name ?? batchId}`, selectedPhotos)),
    onSuccess: (links) => {
      setLastLinks(links);
      toast.success("Catalogo e links criados.");
    },
    onError: () => toast.error("Nao foi possivel criar o catalogo."),
  });

  const makeGroupCatalog = useMutation({
    mutationFn: async ({ label, photos }: { label: string; photos: Photo[] }) => ({
      label,
      links: await createCatalogForPhotos(photos, buildCatalogName(`Catalogo ${batch?.name ?? batchId} | ${label}`, photos)),
    }),
    onSuccess: ({ label, links }) => {
      setLastLinks(links);
      toast.success(`Catalogo do grupo ${label} criado.`);
    },
    onError: () => toast.error("Nao foi possivel criar o catalogo do grupo."),
  });

  function toggle(photoId: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function toggleGroup(photoIds: number[]) {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = photoIds.every((photoId) => next.has(photoId));
      photoIds.forEach((photoId) => {
        if (allSelected) next.delete(photoId);
        else next.add(photoId);
      });
      return next;
    });
  }

  async function createCatalogForPhotos(sourcePhotos: Photo[], name: string) {
    const catalog = await createCatalog({
      catalog: {
        name,
        description: "Catalogo gerado a partir da revisao de fotos",
        status: "published",
        source: "photo_batch",
      },
      photo_ids: sourcePhotos.map((photo) => photo.id),
    });
    const publicLink = await createCatalogLink(catalog.id, { link_type: "public_client" });
    const wholesaleLink = await createCatalogLink(catalog.id, {
      link_type: "wholesale_buyer",
      show_prices: true,
      allow_order: true,
      allow_payment: true,
    });
    return [publicLink.url ?? `/link/${publicLink.token}`, wholesaleLink.url ?? `/link/${wholesaleLink.token}`];
  }

  return (
    <AdminLayout>
      <div className="px-6 py-5 border-b">
        <h1 className="text-xl font-semibold">{batch?.name ?? "Revisao de lote"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revise sugestoes da triagem, aprove em massa e gere links publico/atacado.
        </p>
      </div>

      <div className="p-6 space-y-6">
        <section className="border rounded-lg p-4 bg-background">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Cor aprovada</label>
              <Input value={color} onChange={(event) => setColor(event.target.value)} placeholder="Verde" />
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Pantone</label>
              <Input value={pantone} onChange={(event) => setPantone(event.target.value)} placeholder="17-5641" />
            </div>
            <div className="w-52">
              <label className="text-xs text-muted-foreground">Modelo</label>
              <Input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Biquini cortininha" />
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground">Tamanho</label>
              <select
                aria-label="Tamanho"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={sizeGroup}
                onChange={(event) => setSizeGroup(event.target.value)}
              >
                <option value="">Selecione</option>
                {SIZE_GROUPS.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
            <Button disabled={selected.size === 0 || updatePhotos.isPending} onClick={() => updatePhotos.mutate()}>
              {updatePhotos.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aprovar selecionadas ({selected.size})
            </Button>
            <Button
              variant="secondary"
              disabled={selected.size === 0 || applySuggestions.isPending}
              onClick={() => applySuggestions.mutate()}
            >
              {applySuggestions.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aplicar sugestoes
            </Button>
            <Button variant="outline" disabled={selected.size === 0 || makeCatalog.isPending} onClick={() => makeCatalog.mutate()}>
              {makeCatalog.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Gerar catalogo + links
            </Button>
          </div>

          {lastLinks.length > 0 && (
            <div className="mt-4 grid gap-2 text-sm">
              {lastLinks.map((link) => (
                <button
                  key={link}
                  className="flex items-center gap-2 text-left border rounded-md px-3 py-2 hover:bg-muted"
                  onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${link}`)}
                >
                  <Copy className="h-4 w-4" />
                  {window.location.origin}{link}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="border rounded-lg p-4 bg-background">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Filtrar SKU</label>
              <select
                aria-label="Filtrar SKU"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterSku}
                onChange={(event) => setFilterSku(event.target.value)}
              >
                <option value="all">Todos</option>
                {skuOptions.map((sku) => <option key={sku} value={sku}>{sku}</option>)}
              </select>
            </div>
            <div className="w-48">
              <label className="text-xs text-muted-foreground">Filtrar grupo</label>
              <select
                aria-label="Filtrar grupo"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterGroup}
                onChange={(event) => setFilterGroup(event.target.value)}
              >
                <option value="all">Todos</option>
                {groupOptions.map((group) => <option key={group} value={group}>{humanizeGroup(group)}</option>)}
              </select>
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Filtrar status</label>
              <select
                aria-label="Filtrar status"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="all">Todos</option>
                <option value="uploaded">Uploaded</option>
                <option value="processing">Processando</option>
                <option value="needs_review">Revisao</option>
                <option value="approved">Aprovada</option>
                <option value="published">Publicada</option>
                <option value="error">Erro</option>
              </select>
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Agrupar por</label>
              <select
                aria-label="Agrupar por"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value as "none" | "sku" | "group")}
              >
                <option value="sku">SKU</option>
                <option value="group">Grupo</option>
                <option value="none">Sem agrupamento</option>
              </select>
            </div>
            <div className="pb-2 text-xs text-muted-foreground">
              {filteredPhotos.length} foto(s) visiveis
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando fotos...</div>
        ) : (
          <div className="space-y-6">
            {groupedPhotos.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">{groupBy === "group" ? humanizeGroup(group.label) : group.label}</h2>
                    <p className="text-xs text-muted-foreground">{group.photos.length} foto(s)</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleGroup(group.photos.map((photo) => photo.id))}>
                      {group.photos.every((photo) => selected.has(photo.id)) ? "Desmarcar grupo" : "Selecionar grupo"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={makeGroupCatalog.isPending}
                      onClick={() => makeGroupCatalog.mutate({ label: group.label, photos: group.photos })}
                    >
                      {makeGroupCatalog.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                      Catalogo do grupo
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {group.photos.map((photo) => (
                    <PhotoCard key={photo.id} photo={photo} selected={selected.has(photo.id)} onToggle={() => toggle(photo.id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function PhotoCard({ photo, selected, onToggle }: { photo: Photo; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={[
        "text-left border rounded-lg overflow-hidden bg-background transition-colors",
        selected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50",
      ].join(" ")}
    >
      <div className="aspect-[3/4] bg-muted">
        {photo.display_url && <img src={photo.display_url} alt={photo.original_filename ?? ""} className="w-full h-full object-cover object-top" />}
      </div>
      <div className="p-3 space-y-1 text-xs">
        <div className="font-medium truncate">{photo.original_filename ?? `Foto ${photo.id}`}</div>
        <div className="text-muted-foreground">Status: {photo.status}</div>
        <div>SKU sugerido: {photo.suggested_sku || "-"}</div>
        <div>Modelo: {photo.approved_model || photo.suggested_model || "-"}</div>
        <div>Cor: {photo.approved_color || photo.suggested_color || "-"}</div>
        <div>Pantone: {photo.approved_pantone || photo.suggested_pantone || "-"}</div>
        <div>Tamanho: {photo.approved_size_group || photo.suggested_size_group || "-"}</div>
        <div>Confianca: {photo.confidence_score ? `${Math.round(photo.confidence_score * 100)}%` : "-"}</div>
      </div>
    </button>
  );
}

function humanizeGroup(group: string) {
  return group
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function buildCatalogName(baseName: string, photos: Photo[]) {
  const sku = photos.map((photo) => photo.suggested_sku).find(Boolean);
  const model = photos.map((photo) => photo.approved_model || photo.suggested_model).find(Boolean);
  const color = photos.map((photo) => photo.approved_color || photo.suggested_color).find(Boolean);
  const size = photos.map((photo) => photo.approved_size_group || photo.suggested_size_group).find(Boolean);

  const parts = [baseName];
  [sku, model, color, size].filter(Boolean).forEach((part) => {
    if (!parts.some((existing) => existing.includes(String(part)))) parts.push(String(part));
  });

  return parts.join(" | ");
}
