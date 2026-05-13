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
  const [lastLinks, setLastLinks] = useState<string[]>([]);

  const { data: batch, isLoading } = useQuery({
    queryKey: ["admin", "photo-batch", batchId],
    queryFn: () => getPhotoBatch(batchId),
    enabled: Number.isFinite(batchId),
  });

  const photos = batch?.photos ?? [];
  const selectedPhotos = useMemo(() => photos.filter((photo) => selected.has(photo.id)), [photos, selected]);

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

  const makeCatalog = useMutation({
    mutationFn: async () => {
      const catalog = await createCatalog({
        catalog: {
          name: `Catalogo ${batch?.name ?? batchId}`,
          description: "Catalogo gerado a partir da revisao de fotos",
          status: "published",
          source: "photo_batch",
        },
        photo_ids: selectedPhotos.map((photo) => photo.id),
      });
      const publicLink = await createCatalogLink(catalog.id, { link_type: "public_client" });
      const wholesaleLink = await createCatalogLink(catalog.id, {
        link_type: "wholesale_buyer",
        show_prices: true,
        allow_order: true,
        allow_payment: true,
      });
      return [publicLink.url ?? `/link/${publicLink.token}`, wholesaleLink.url ?? `/link/${wholesaleLink.token}`];
    },
    onSuccess: (links) => {
      setLastLinks(links);
      toast.success("Catalogo e links criados.");
    },
    onError: () => toast.error("Nao foi possivel criar o catalogo."),
  });

  function toggle(photoId: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
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

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando fotos...</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} selected={selected.has(photo.id)} onToggle={() => toggle(photo.id)} />
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
        <div>Cor: {photo.approved_color || photo.suggested_color || "-"}</div>
        <div>Pantone: {photo.approved_pantone || photo.suggested_pantone || "-"}</div>
        <div>Tamanho: {photo.approved_size_group || photo.suggested_size_group || "-"}</div>
      </div>
    </button>
  );
}
