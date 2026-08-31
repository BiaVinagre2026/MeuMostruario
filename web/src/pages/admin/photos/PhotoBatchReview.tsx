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
import { SIZE_GROUPS, type Photo, type PhotoBatch } from "@/types/photoCatalog";
import { sizeLabelComNumeracao } from "@/lib/sizeGroups";

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
  const [filterPriority, setFilterPriority] = useState<"all" | "low_confidence">("all");
  const [groupBy, setGroupBy] = useState<"none" | "sku" | "group">("sku");
  const [lastLinks, setLastLinks] = useState<string[]>([]);

  const { data: batch, isLoading } = useQuery({
    queryKey: ["admin", "photo-batch", batchId],
    queryFn: () => getPhotoBatch(batchId),
    enabled: Number.isFinite(batchId),
  });

  // Sem o useMemo, o ?? [] cria um array novo a cada render e invalida todos os
  // useMemo abaixo, que recalculam a lista inteira de fotos sem necessidade.
  const photos = useMemo(() => batch?.photos ?? [], [batch]);
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
        if (filterPriority === "low_confidence" && !isLowConfidence(photo)) return false;
        return true;
      }),
    [filterGroup, filterPriority, filterSku, filterStatus, photos]
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
  const hasActiveFilters = filterSku !== "all" || filterGroup !== "all" || filterStatus !== "all" || filterPriority !== "all" || groupBy !== "sku";
  const allVisibleSelected = filteredPhotos.length > 0 && filteredPhotos.every((photo) => selected.has(photo.id));
  const reviewSummary = useMemo(() => ({
    total: photos.length,
    needsReview: photos.filter((photo) => photo.status === "needs_review").length,
    approved: photos.filter((photo) => photo.status === "approved").length,
    error: photos.filter((photo) => photo.status === "error").length,
    averageConfidence: photos.length === 0
      ? 0
      : photos.reduce((sum, photo) => sum + (photo.confidence_score ?? 0), 0) / photos.length,
  }), [photos]);

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

  function toggleVisiblePhotos() {
    toggleGroup(filteredPhotos.map((photo) => photo.id));
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

  function resetFilters() {
    setFilterSku("all");
    setFilterGroup("all");
    setFilterStatus("all");
    setFilterPriority("all");
    setGroupBy("sku");
  }

  function applyPriorityFilter(priority: "all" | "low_confidence") {
    setFilterPriority(priority);
    if (priority === "low_confidence") {
      setFilterStatus("all");
      setGroupBy("none");
    }
  }

  function copyCreatedLink(link: string) {
    void navigator.clipboard.writeText(`${window.location.origin}${link}`);
    toast.success("Link copiado.");
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
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total do lote" value={String(reviewSummary.total)} />
          <SummaryCard label="Em revisao" value={String(reviewSummary.needsReview)} />
          <SummaryCard label="Aprovadas" value={String(reviewSummary.approved)} />
          <SummaryCard label="Com erro" value={String(reviewSummary.error)} />
        </section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="Confianca media" value={`${Math.round(reviewSummary.averageConfidence * 100)}%`} />
          <SummaryCard label="Selecionadas" value={String(selected.size)} />
          <SummaryCard label="Visiveis" value={String(filteredPhotos.length)} />
        </section>
        {batch && (
          <section className="border rounded-lg p-4 bg-background">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Status do lote: {humanizeBatchStatus(batch.status)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {batch.processed_count} de {batch.total_count} fotos processadas · {batch.error_count} com erro
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Ultima atualizacao: {new Date(batch.updated_at).toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${batch.total_count === 0 ? 0 : Math.min(100, Math.round((batch.processed_count / batch.total_count) * 100))}%` }}
              />
            </div>
          </section>
        )}

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
                {SIZE_GROUPS.map((size) => <option key={size} value={size}>{sizeLabelComNumeracao(size)}</option>)}
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
            {filteredPhotos.length > 0 && (
              <Button variant="outline" onClick={toggleVisiblePhotos}>
                {allVisibleSelected ? "Desmarcar visiveis" : "Selecionar visiveis"}
              </Button>
            )}
            {selected.size > 0 && (
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                Limpar selecao
              </Button>
            )}
            <div className="text-xs text-muted-foreground">
              {selected.size} foto(s) selecionada(s)
            </div>
          </div>

          {lastLinks.length > 0 && (
            <div className="mt-4 grid gap-2 text-sm">
              {lastLinks.map((link) => (
                <button
                  key={link}
                  className="flex items-center gap-2 text-left border rounded-md px-3 py-2 hover:bg-muted"
                  onClick={() => copyCreatedLink(link)}
                >
                  <Copy className="h-4 w-4" />
                  {window.location.origin}{link}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="border rounded-lg p-4 bg-background">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant={filterStatus === "needs_review" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("needs_review")}>
              Somente revisao
            </Button>
            <Button variant={filterStatus === "approved" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("approved")}>
              Somente aprovadas
            </Button>
            <Button variant={filterPriority === "low_confidence" ? "default" : "outline"} size="sm" onClick={() => applyPriorityFilter(filterPriority === "low_confidence" ? "all" : "low_confidence")}>
              Baixa confianca
            </Button>
          </div>
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
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="mb-0.5" onClick={resetFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </section>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando fotos...</div>
        ) : groupedPhotos.length === 0 ? (
          <div className="border rounded-lg p-8 text-sm text-muted-foreground">
            Nenhuma foto encontrada para os filtros aplicados.
          </div>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function PhotoCard({ photo, selected, onToggle }: { photo: Photo; selected: boolean; onToggle: () => void }) {
  const confidence = photo.confidence_score ? Math.round(photo.confidence_score * 100) : null;
  const lowConfidence = isLowConfidence(photo);

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
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {humanizePhotoStatus(photo.status)}
          </span>
          {lowConfidence && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
              Revisao manual recomendada
            </span>
          )}
        </div>
        <div>SKU sugerido: {photo.suggested_sku || "-"}</div>
        <div>Modelo: {photo.approved_model || photo.suggested_model || "-"}</div>
        <div>Cor: {photo.approved_color || photo.suggested_color || "-"}</div>
        <div>Pantone: {photo.approved_pantone || photo.suggested_pantone || "-"}</div>
        <div>Tamanho: {photo.approved_size_group || photo.suggested_size_group || "-"}</div>
        <div>Confianca: {confidence ? `${confidence}%` : "-"}</div>
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

// O limiar vive no backend (Photo::CONFIDENCE_THRESHOLD). O fallback so cobre
// respostas antigas que ainda nao trazem a flag.
function isLowConfidence(photo: Photo) {
  return photo.low_confidence ?? (photo.confidence_score ?? 0) < 0.9;
}

function humanizePhotoStatus(status: Photo["status"]) {
  switch (status) {
    case "uploaded":
      return "Upload concluido";
    case "processing":
      return "Processando";
    case "needs_review":
      return "Em revisao";
    case "approved":
      return "Aprovada";
    case "published":
      return "Publicada";
    case "error":
      return "Com erro";
    default:
      return status;
  }
}

function humanizeBatchStatus(status: PhotoBatch["status"]) {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "uploading":
      return "Recebendo fotos";
    case "processing":
      return "Processando";
    case "review":
      return "Em revisao";
    case "reviewed":
      return "Revisado";
    case "published":
      return "Publicado";
    case "error":
      return "Com erro";
    default:
      return status;
  }
}
