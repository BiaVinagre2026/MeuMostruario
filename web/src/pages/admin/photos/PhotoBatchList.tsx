import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Images, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPhotoBatch, getPhotoBatches } from "@/lib/api/photoCatalog";

export default function PhotoBatchList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["admin", "photo-batches"],
    queryFn: getPhotoBatches,
  });

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const upload = useMutation({
    mutationFn: () => createPhotoBatch(name || "Novo lote de fotos", files),
    onSuccess: (batch) => {
      toast.success("Lote criado. A triagem foi enfileirada.");
      setFiles([]);
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "photo-batches"] });
      navigate(`/admin/photo-batches/${batch.id}`);
    },
    onError: () => toast.error("Nao foi possivel criar o lote."),
  });

  function appendFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next = [...files, ...Array.from(fileList)].slice(0, 100);
    setFiles(next);
  }

  return (
    <AdminLayout>
      <div className="px-6 py-5 border-b">
        <h1 className="text-xl font-semibold">Lotes de fotos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suba ate 100 fotos por lote para triagem automatica por cor, Pantone, modelo e tamanho.
        </p>
      </div>

      <div className="p-6 grid gap-6 lg:grid-cols-[420px_1fr]">
        <section className="border rounded-lg p-5 bg-background">
          <div className="flex items-center gap-2 mb-4">
            <UploadCloud className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Novo lote</h2>
          </div>

          <div className="space-y-4">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do lote" />

            <label
              className="block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/60 transition-colors"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                appendFiles(event.dataTransfer.files);
              }}
            >
              <Images className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Clique ou arraste fotos aqui</span>
              <span className="block text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP. Limite de 100 fotos.</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => appendFiles(event.target.files)}
              />
            </label>

            <div className="text-sm text-muted-foreground">
              {files.length} foto(s) selecionada(s) · {(totalSize / 1024 / 1024).toFixed(1)} MB
            </div>

            {files.length > 0 && (
              <div className="max-h-40 overflow-auto border rounded-md divide-y">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="px-3 py-2 text-xs flex justify-between gap-3">
                    <span className="truncate">{file.name}</span>
                    <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full" disabled={files.length === 0 || upload.isPending} onClick={() => upload.mutate()}>
              {upload.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar lote e iniciar triagem
            </Button>
          </div>
        </section>

        <section className="border rounded-lg overflow-hidden bg-background">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Historico</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Carregando...</div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground">Nenhum lote criado ainda.</div>
          ) : (
            <div className="divide-y">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  className="w-full text-left px-5 py-4 hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/admin/photo-batches/${batch.id}`)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{batch.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {batch.total_count} fotos · {batch.processed_count} processadas · {batch.error_count} erros
                      </div>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{batch.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
