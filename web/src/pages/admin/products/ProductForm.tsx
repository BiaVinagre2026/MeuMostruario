import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useForm,
  type UseFormRegister,
  type UseFormWatch,
  type UseFormSetValue,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Loader2,
  Upload,
  Trash2,
  Star,
  ImageOff,
} from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  getProduct,
  createProduct,
  updateProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  addProductImage,
  deleteProductImage,
  uploadFile,
} from "@/lib/api/products";
import { ApiError } from "@/lib/api/client";
import { getCollections, getCategories } from "@/lib/api/collections";
import type { Product, ProductVariant, ProductImage, ProductStatus } from "@/types/product";

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const productSchema = z.object({
  name: z.string(),
  sku: z.string(),
  status: z.enum(["draft", "published", "archived", "sold_out"]),
  position: z.number().int().min(0),
  collection_id: z.number().nullable(),
  category_id: z.number().nullable(),
  price_wholesale: z.number().min(0, "Preço atacado obrigatório"),
  price_retail: z.number().min(0),
  description: z.string(),
  fabric_composition: z.string(),
  care_instructions: z.string(),
  tags: z.string(), // comma-separated, converted on submit
});

type ProductFormValues = z.infer<typeof productSchema>;

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type TabId = "info" | "photos" | "variants";

const TABS: { id: TabId; label: string }[] = [
  { id: "info", label: "Informações Básicas" },
  { id: "photos", label: "Fotos" },
  { id: "variants", label: "Variantes" },
];

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" },
  { value: "sold_out", label: "Esgotado" },
];

// ---------------------------------------------------------------------------
// ProductForm
// ---------------------------------------------------------------------------

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const productId = id ? parseInt(id, 10) : null;
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const initialTab = isEdit ? ((searchParams.get("tab") as TabId) ?? "info") : "info";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);

  // Fetch existing product for edit
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: () => getProduct(productId!),
    enabled: isEdit && !!productId,
  });

  // Fetch reference data
  const { data: collections = [] } = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: getCollections,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: getCategories,
  });

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      status: "draft",
      position: 0,
      collection_id: null,
      category_id: null,
      price_wholesale: 0,
      price_retail: 0,
      description: "",
      fabric_composition: "",
      care_instructions: "",
      tags: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        sku: product.sku,
        status: product.status,
        position: product.position,
        collection_id: product.collection_id,
        category_id: product.category_id,
        price_wholesale: product.price_wholesale,
        price_retail: product.price_retail,
        description: product.description ?? "",
        fabric_composition: product.fabric_composition ?? "",
        care_instructions: product.care_instructions ?? "",
        tags: (product.tags ?? []).join(", "),
      });
    }
  }, [product, reset]);

  // Save mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<Product>) => createProduct(data),
    onSuccess: (created) => {
      toast.success("Produto criado!");
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      const goTo = pendingTab ?? "info";
      setPendingTab(null);
      navigate(`/admin/products/${created.id}/edit?tab=${goTo}`, { replace: true });
    },
    onError: () => toast.error("Erro ao criar produto."),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Product>) => updateProduct(productId!, data),
    onSuccess: () => {
      toast.success("Produto salvo.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    },
    onError: () => toast.error("Erro ao salvar produto."),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function handleTabClick(tabId: TabId) {
    if (!isEdit && tabId !== "info") {
      setPendingTab(tabId);
      void handleSubmit(onSubmit)();
      return;
    }
    setActiveTab(tabId);
  }

  function onSubmit(values: ProductFormValues) {
    const payload: Partial<Product> = {
      ...values,
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  if (isEdit && isLoadingProduct) {
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
            onClick={() => navigate("/admin/products")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            {isEdit ? "Editar Produto" : "Novo Produto"}
          </h1>
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          {isEdit ? "Salvar" : "Criar Produto"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b px-6">
        <div className="flex gap-0">
          {TABS.map((tab) => {
            const lockedOnNew = !isEdit && tab.id !== "info";
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={lockedOnNew ? "Salva as informações básicas para acessar esta aba" : undefined}
                className={[
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tab.label}
                {lockedOnNew && (
                  <span className="text-xs text-muted-foreground/60">↵</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {activeTab === "info" && (
          <InfoTab
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            collections={collections}
            categories={categories}
            isEdit={isEdit}
          />
        )}
        {activeTab === "photos" && (
          isEdit && product
            ? <PhotosTab product={product} productId={productId!} />
            : <div className="text-sm text-muted-foreground py-8">Preencha as informações básicas e clique nesta aba para salvar e continuar.</div>
        )}
        {activeTab === "variants" && (
          isEdit && product
            ? <VariantsTab product={product} productId={productId!} />
            : <div className="text-sm text-muted-foreground py-8">Preencha as informações básicas e clique nesta aba para salvar e continuar.</div>
        )}
      </div>

      {/* Unsaved changes hint */}
      {isEdit && isDirty && (
        <div className="px-6 py-3 border-t bg-yellow-50 text-yellow-800 text-sm flex items-center justify-between">
          <span>Você tem alterações não salvas nas informações básicas.</span>
          <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={isSaving}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Salvar
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// InfoTab
// ---------------------------------------------------------------------------

interface InfoTabProps {
  register: UseFormRegister<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  collections: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  isEdit: boolean;
}

function InfoTab({ register, errors, watch, setValue, collections, categories }: InfoTabProps) {
  const statusValue = watch("status");
  const collectionIdValue = watch("collection_id");
  const categoryIdValue = watch("category_id");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU *</Label>
          <Input id="sku" {...register("sku")} />
          {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={statusValue}
            onChange={(e) =>
              setValue("status", e.target.value as ProductFormValues["status"], {
                shouldDirty: true,
              })
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="collection_id">Coleção</Label>
          <select
            id="collection_id"
            value={collectionIdValue ?? ""}
            onChange={(e) =>
              setValue(
                "collection_id",
                e.target.value ? parseInt(e.target.value, 10) : null,
                { shouldDirty: true }
              )
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Sem coleção</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category_id">Categoria</Label>
          <select
            id="category_id"
            value={categoryIdValue ?? ""}
            onChange={(e) =>
              setValue(
                "category_id",
                e.target.value ? parseInt(e.target.value, 10) : null,
                { shouldDirty: true }
              )
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="price_wholesale">Preço Atacado *</Label>
          <Input
            id="price_wholesale"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            {...register("price_wholesale", { valueAsNumber: true })}
          />
          {errors.price_wholesale && (
            <p className="text-xs text-destructive">{errors.price_wholesale.message}</p>
          )}
          <p className="text-xs text-muted-foreground">Ex: 89.90 → R$ 89,90</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price_retail">Preço Varejo</Label>
          <Input
            id="price_retail"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            {...register("price_retail", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">Ex: 139.90 → R$ 139,90</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <textarea
          id="description"
          rows={4}
          {...register("description")}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fabric_composition">Composição do tecido</Label>
        <textarea
          id="fabric_composition"
          rows={2}
          {...register("fabric_composition")}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="care_instructions">Instruções de lavagem</Label>
        <textarea
          id="care_instructions"
          rows={2}
          {...register("care_instructions")}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          placeholder="ex: verão, casual, linho"
          {...register("tags")}
        />
        <p className="text-xs text-muted-foreground">Separe as tags por vírgula.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhotosTab
// ---------------------------------------------------------------------------

function PhotosTab({ product, productId }: { product: Product; productId: number }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addImageMutation = useMutation({
    mutationFn: ({ url, isCover }: { url: string; isCover?: boolean }) =>
      addProductImage(productId, url, isCover),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    },
    onError: () => toast.error("Erro ao adicionar imagem."),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) => deleteProductImage(productId, imageId),
    onSuccess: () => {
      toast.success("Imagem removida.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    },
    onError: () => toast.error("Erro ao remover imagem."),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadFile(file);
        const isCover = product.images.length === 0;
        await addImageMutation.mutateAsync({ url, isCover });
      }
      toast.success("Imagem(ns) adicionada(s).");
    } catch {
      toast.error("Falha no upload de uma ou mais imagens.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={[
          "border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
        ].join(" ")}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {isUploading ? "Enviando..." : "Clique ou arraste imagens aqui"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            JPG, PNG ou WEBP. Múltiplos arquivos aceitos.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {/* Image grid */}
      {product.images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {product.images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              isDeleting={deleteImageMutation.isPending}
              onDelete={() => deleteImageMutation.mutate(img.id)}
              onSetCover={() =>
                addImageMutation.mutate({ url: img.urls.original, isCover: true })
              }
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg flex flex-col items-center py-12 gap-2 text-muted-foreground">
          <ImageOff className="h-8 w-8" />
          <p className="text-sm">Nenhuma imagem adicionada.</p>
        </div>
      )}
    </div>
  );
}

function ImageCard({
  image,
  isDeleting,
  onDelete,
  onSetCover,
}: {
  image: ProductImage;
  isDeleting: boolean;
  onDelete: () => void;
  onSetCover: () => void;
}) {
  return (
    <div className="relative group rounded-lg overflow-hidden border bg-muted aspect-[3/4]">
      <img
        src={image.urls.regular ?? image.urls.original}
        alt=""
        className="w-full h-full object-cover object-top"
      />
      {/* Cover badge */}
      {image.is_cover && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
          <Star className="h-3 w-3" />
          Capa
        </div>
      )}
      {/* Actions overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end gap-1.5 p-2">
        {!image.is_cover && (
          <button
            onClick={onSetCover}
            title="Definir como capa"
            className="flex-1 bg-white/90 hover:bg-white text-foreground text-xs py-1.5 rounded font-medium transition-colors"
          >
            <Star className="h-3 w-3 inline mr-1" />
            Capa
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          title="Remover imagem"
          className="bg-destructive/90 hover:bg-destructive text-white text-xs p-1.5 rounded transition-colors"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VariantsTab
// ---------------------------------------------------------------------------

import { PANTONE_COLORS } from "@/data/pantone";

function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string, name: string) => void;
}) {
  const selected = PANTONE_COLORS.find((c) => c.hex === value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1.5" style={{ maxWidth: 152 }}>
        {PANTONE_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.name}
            onClick={() => onChange(c.hex, c.name)}
            className="w-6 h-6 rounded-full transition-all hover:scale-110 flex-shrink-0"
            style={{
              background: c.hex,
              boxShadow:
                value === c.hex
                  ? "0 0 0 2px white, 0 0 0 3.5px #1C1C1C"
                  : "0 0 0 1px rgba(0,0,0,0.18)",
            }}
          />
        ))}
      </div>
      {selected && (
        <span className="text-xs text-muted-foreground leading-none">{selected.name}</span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

const SIZES = ["PP", "P", "M", "G", "GG"] as const;
type SizeKey = (typeof SIZES)[number];

interface NewColorRow {
  color: string;
  color_hex: string;
  image_url: string;
  stocks: Record<SizeKey, number>;
}

const EMPTY_COLOR_ROW: NewColorRow = {
  color: PANTONE_COLORS[0].name,
  color_hex: PANTONE_COLORS[0].hex,
  image_url: "",
  stocks: { PP: 0, P: 0, M: 0, G: 0, GG: 0 },
};

function VariantsTab({ product, productId }: { product: Product; productId: number }) {
  const queryClient = useQueryClient();

  // Pega o primeiro (e único) grupo de variantes
  const group = useMemo(() => {
    const map = new Map<string, { color: string; color_hex: string; image_url: string; variants: ProductVariant[] }>();
    for (const v of product.variants) {
      const key = v.color_hex ?? v.color ?? "";
      if (!map.has(key)) {
        map.set(key, { color: v.color ?? "", color_hex: v.color_hex ?? "", image_url: v.image_url ?? "", variants: [] });
      }
      map.get(key)!.variants.push(v);
    }
    return map.size > 0 ? Array.from(map.values())[0] : null;
  }, [product.variants]);

  const createVariantMutation = useMutation({
    mutationFn: (data: { color: string; color_hex: string; size: string; stock_qty: number; image_url: string | null }) =>
      createVariant(productId, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao criar variante."),
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: number; data: Partial<ProductVariant> }) =>
      updateVariant(productId, variantId, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar variante."),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: number) => deleteVariant(productId, variantId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao remover variante."),
  });

  return (
    <div className="max-w-sm">
      {group ? (
        <ExistingColorRow
          group={group}
          isSaving={updateVariantMutation.isPending || createVariantMutation.isPending}
          isDeleting={deleteVariantMutation.isPending}
          onSaveVariant={(variantId, data) => updateVariantMutation.mutate({ variantId, data })}
          onCreateVariant={(data) => createVariantMutation.mutateAsync(data)}
          onDeleteGroup={() => group.variants.forEach((v) => deleteVariantMutation.mutate(v.id))}
        />
      ) : (
        <NewVariantCard
          isSaving={createVariantMutation.isPending}
          onSave={async (row) => {
            for (const size of SIZES) {
              await createVariantMutation.mutateAsync({
                color: row.color, color_hex: row.color_hex, size,
                stock_qty: row.stocks[size], image_url: row.image_url || null,
              });
            }
            toast.success("Grade salva.");
          }}
        />
      )}
    </div>
  );
}

function NewVariantCard({ isSaving, onSave }: {
  isSaving: boolean;
  onSave: (row: NewColorRow) => Promise<void>;
}) {
  const [row, setRow] = useState<NewColorRow>({ ...EMPTY_COLOR_ROW, stocks: { PP: 0, P: 0, M: 0, G: 0, GG: 0 } });

  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex gap-5 items-start">
        <ColorSwatchPicker
          value={row.color_hex}
          onChange={(hex, name) => setRow((r) => ({ ...r, color_hex: hex, color: name }))}
        />
        <div className="flex-1 space-y-1.5">
          {SIZES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{s}</span>
              <Input
                type="number" min={0}
                value={row.stocks[s]}
                onChange={(e) => setRow((r) => ({ ...r, stocks: { ...r.stocks, [s]: parseInt(e.target.value || "0", 10) } }))}
                className="h-7 text-xs w-full text-center px-1"
              />
            </div>
          ))}
        </div>
      </div>
      <Input
        placeholder="URL da imagem (opcional)"
        value={row.image_url}
        onChange={(e) => setRow((r) => ({ ...r, image_url: e.target.value }))}
        className="h-8 text-xs"
      />
      <Button size="sm" className="w-full h-8 text-xs" disabled={isSaving} onClick={() => void onSave(row)}>
        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar grade"}
      </Button>
    </div>
  );
}

function ExistingColorRow({
  group,
  isSaving,
  isDeleting,
  onSaveVariant,
  onCreateVariant,
  onDeleteGroup,
}: {
  group: { color: string; color_hex: string; image_url: string; variants: ProductVariant[] };
  isSaving: boolean;
  isDeleting: boolean;
  onSaveVariant: (variantId: number, data: Partial<ProductVariant>) => void;
  onCreateVariant: (data: { color: string; color_hex: string; size: string; stock_qty: number; image_url: string | null }) => Promise<unknown>;
  onDeleteGroup: () => void;
}) {
  const [colorHex, setColorHex] = useState(group.color_hex);
  const [color, setColor]       = useState(group.color);
  const [imageUrl, setImageUrl] = useState(group.image_url);
  const [stocks, setStocks]     = useState<Record<string, number>>(
    Object.fromEntries(group.variants.map((v) => [v.size, v.stock_qty ?? 0]))
  );

  const isDirty =
    color !== group.color ||
    colorHex !== group.color_hex ||
    imageUrl !== group.image_url ||
    SIZES.some((s) => (stocks[s] ?? 0) !== (group.variants.find((v) => v.size === s)?.stock_qty ?? 0));

  async function handleSave() {
    for (const size of SIZES) {
      const variant = group.variants.find((v) => v.size === size);
      const stockVal = stocks[size] ?? 0;
      if (variant) {
        onSaveVariant(variant.id, { color, color_hex: colorHex, stock_qty: stockVal, image_url: imageUrl || null });
      } else if (stockVal > 0) {
        await onCreateVariant({ color, color_hex: colorHex, size, stock_qty: stockVal, image_url: imageUrl || null });
      }
    }
    toast.success("Variantes salvas.");
  }

  return (
    <div className="border rounded-md p-4 space-y-3 relative">
      <Button
        variant="ghost" size="sm"
        onClick={onDeleteGroup} disabled={isDeleting}
        className="absolute top-2 right-2 h-7 w-7 p-0 text-destructive hover:text-destructive"
      >
        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>

      <div className="flex gap-5 items-start">
        <ColorSwatchPicker
          value={colorHex}
          onChange={(hex, name) => { setColorHex(hex); setColor(name); }}
        />
        <div className="flex-1 space-y-1.5">
          {SIZES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{s}</span>
              <Input
                type="number" min={0}
                value={stocks[s] ?? 0}
                onChange={(e) => setStocks((prev) => ({ ...prev, [s]: parseInt(e.target.value || "0", 10) }))}
                className="h-7 text-xs w-full text-center px-1"
              />
            </div>
          ))}
        </div>
      </div>

      <Input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="URL da imagem (opcional)"
        className="h-8 text-xs"
      />

      {isDirty && (
        <Button size="sm" className="w-full h-8 text-xs" disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar alterações"}
        </Button>
      )}
    </div>
  );
}
