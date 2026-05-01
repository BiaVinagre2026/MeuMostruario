import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Upload, ImageOff } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCollection,
  createCollection,
  updateCollection,
} from "@/lib/api/collections";
import { uploadFile } from "@/lib/api/products";
import type { Collection, CollectionStatus } from "@/types/product";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const collectionSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  position: z.number().int().min(0),
  cover_url: z.string(),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

const STATUS_OPTIONS: { value: CollectionStatus; label: string }[] = [
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicada" },
  { value: "archived", label: "Arquivada" },
];

// ---------------------------------------------------------------------------
// CollectionForm
// ---------------------------------------------------------------------------

export default function CollectionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const collectionId = id ? parseInt(id, 10) : null;
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: collection, isLoading } = useQuery({
    queryKey: ["admin", "collection", collectionId],
    queryFn: () => getCollection(collectionId!),
    enabled: isEdit && !!collectionId,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "draft",
      position: 0,
      cover_url: "",
    },
  });

  useEffect(() => {
    if (collection) {
      reset({
        name: collection.name,
        description: collection.description ?? "",
        status: collection.status,
        position: collection.position,
        cover_url: collection.cover_url ?? "",
      });
    }
  }, [collection, reset]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Collection>) => createCollection(data),
    onSuccess: (created) => {
      toast.success("Coleção criada.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "collections"] });
      navigate(`/admin/collections/${created.id}/edit`, { replace: true });
    },
    onError: () => toast.error("Erro ao criar coleção."),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Collection>) => updateCollection(collectionId!, data),
    onSuccess: () => {
      toast.success("Coleção salva.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "collections"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "collection", collectionId],
      });
    },
    onError: () => toast.error("Erro ao salvar coleção."),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: CollectionFormValues) {
    const payload: Partial<Collection> = {
      ...values,
      cover_url: values.cover_url || null,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  async function handleCoverUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const { url } = await uploadFile(files[0]);
      setValue("cover_url", url, { shouldDirty: true });
      toast.success("Imagem enviada. Salve para confirmar.");
    } catch {
      toast.error("Falha no upload da imagem.");
    } finally {
      setIsUploading(false);
    }
  }

  const statusValue = watch("status");
  const coverUrlValue = watch("cover_url");

  if (isEdit && isLoading) {
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
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/collections")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            {isEdit ? "Editar Coleção" : "Nova Coleção"}
          </h1>
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          {isEdit ? "Salvar" : "Criar Coleção"}
        </Button>
      </div>

      {/* Form body */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-2xl space-y-6">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              rows={4}
              {...register("description")}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>

          {/* Status + Position */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusValue}
                onChange={(e) =>
                  setValue(
                    "status",
                    e.target.value as CollectionFormValues["status"],
                    { shouldDirty: true }
                  )
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Posição</Label>
              <Input
                id="position"
                type="number"
                min={0}
                {...register("position", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Cover image */}
          <div className="space-y-2">
            <Label>Imagem de Capa</Label>

            {/* Preview */}
            {coverUrlValue ? (
              <div className="relative w-40 h-40 rounded-lg overflow-hidden border bg-muted">
                <img
                  src={coverUrlValue}
                  alt="Capa da coleção"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setValue("cover_url", "", { shouldDirty: true })}
                  className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-40 h-40 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                <ImageOff className="h-6 w-6" />
                <span className="text-xs">Sem capa</span>
              </div>
            )}

            {/* URL input */}
            <div className="space-y-1.5">
              <Input
                placeholder="https://..."
                {...register("cover_url")}
              />
              <p className="text-xs text-muted-foreground">
                Cole uma URL ou faça upload de um arquivo.
              </p>
            </div>

            {/* Upload button */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? "Enviando..." : "Upload de imagem"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => void handleCoverUpload(e.target.files)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved changes notice */}
      {isEdit && isDirty && (
        <div className="px-6 py-3 border-t bg-yellow-50 text-yellow-800 text-sm flex items-center justify-between">
          <span>Você tem alterações não salvas.</span>
          <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={isSaving}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Salvar
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
