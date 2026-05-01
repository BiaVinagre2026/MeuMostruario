import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Plus,
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

  const [activeTab, setActiveTab] = useState<TabId>("info");

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
      toast.success("Produto criado. Agora adicione fotos e variantes.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      navigate(`/admin/products/${created.id}/edit`, { replace: true });
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
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!isEdit && tab.id !== "info"}
              className={[
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
                !isEdit && tab.id !== "info"
                  ? "opacity-40 cursor-not-allowed"
                  : "",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
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
        {activeTab === "photos" && isEdit && product && (
          <PhotosTab product={product} productId={productId!} />
        )}
        {activeTab === "variants" && isEdit && product && (
          <VariantsTab product={product} productId={productId!} />
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

interface NewVariantRow {
  color: string;
  color_hex: string;
  size: string;
  stock_qty: number;
  image_url: string;
}

const EMPTY_ROW: NewVariantRow = {
  color: "",
  color_hex: "#000000",
  size: "",
  stock_qty: 0,
  image_url: "",
};

function VariantsTab({ product, productId }: { product: Product; productId: number }) {
  const queryClient = useQueryClient();
  const [newRows, setNewRows] = useState<NewVariantRow[]>([]);

  const createVariantMutation = useMutation({
    mutationFn: (row: NewVariantRow) =>
      createVariant(productId, {
        color: row.color,
        color_hex: row.color_hex,
        size: row.size,
        stock_qty: row.stock_qty,
        image_url: row.image_url || null,
      }),
    onSuccess: () => {
      toast.success("Variante adicionada.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    },
    onError: () => toast.error("Erro ao criar variante."),
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: number; data: Partial<ProductVariant> }) =>
      updateVariant(productId, variantId, data),
    onSuccess: () => {
      toast.success("Variante salva.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    },
    onError: () => toast.error("Erro ao salvar variante."),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: number) => deleteVariant(productId, variantId),
    onSuccess: () => {
      toast.success("Variante removida.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    },
    onError: () => toast.error("Erro ao remover variante."),
  });

  function addRow() {
    setNewRows((rows) => [...rows, { ...EMPTY_ROW }]);
  }

  function updateRow(index: number, field: keyof NewVariantRow, value: string | number) {
    setNewRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeNewRow(index: number) {
    setNewRows((rows) => rows.filter((_, i) => i !== index));
  }

  async function saveRow(index: number) {
    const row = newRows[index];
    await createVariantMutation.mutateAsync(row);
    setNewRows((rows) => rows.filter((_, i) => i !== index));
  }

  const thClass = "text-left px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide";
  const tdClass = "px-3 py-2";

  return (
    <div className="max-w-3xl space-y-4">
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className={thClass}>Cor</th>
              <th className={thClass}>Hex</th>
              <th className={thClass}>Tamanho</th>
              <th className={thClass}>Estoque</th>
              <th className={thClass}>Imagem da cor</th>
              <th className={thClass + " w-24"}></th>
            </tr>
          </thead>
          <tbody>
            {product.variants.map((variant) => (
              <ExistingVariantRow
                key={variant.id}
                variant={variant}
                isSaving={updateVariantMutation.isPending}
                isDeleting={deleteVariantMutation.isPending}
                onSave={(data) => updateVariantMutation.mutate({ variantId: variant.id, data })}
                onDelete={() => deleteVariantMutation.mutate(variant.id)}
              />
            ))}

            {newRows.map((row, idx) => (
              <tr key={`new-${idx}`} className="bg-blue-50/50">
                <td className={tdClass}>
                  <Input
                    placeholder="Ex: Preto"
                    value={row.color}
                    onChange={(e) => updateRow(idx, "color", e.target.value)}
                    className="h-8 text-xs"
                  />
                </td>
                <td className={tdClass}>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={row.color_hex}
                      onChange={(e) => updateRow(idx, "color_hex", e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      value={row.color_hex}
                      onChange={(e) => updateRow(idx, "color_hex", e.target.value)}
                      className="h-8 text-xs w-24 font-mono"
                    />
                  </div>
                </td>
                <td className={tdClass}>
                  <Input
                    placeholder="Ex: M"
                    value={row.size}
                    onChange={(e) => updateRow(idx, "size", e.target.value)}
                    className="h-8 text-xs w-20"
                  />
                </td>
                <td className={tdClass}>
                  <Input
                    type="number"
                    min={0}
                    value={row.stock_qty}
                    onChange={(e) =>
                      updateRow(idx, "stock_qty", parseInt(e.target.value || "0", 10))
                    }
                    className="h-8 text-xs w-20"
                  />
                </td>
                <td className={tdClass}>
                  <Input
                    placeholder="https://..."
                    value={row.image_url}
                    onChange={(e) => updateRow(idx, "image_url", e.target.value)}
                    className="h-8 text-xs"
                  />
                </td>
                <td className={tdClass}>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => void saveRow(idx)}
                      disabled={createVariantMutation.isPending}
                    >
                      {createVariantMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Salvar"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => removeNewRow(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {product.variants.length === 0 && newRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Nenhuma variante. Clique em "Adicionar Variante" abaixo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Button variant="outline" onClick={addRow} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Adicionar Variante
      </Button>
    </div>
  );
}

function ExistingVariantRow({
  variant,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
}: {
  variant: ProductVariant;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (data: Partial<ProductVariant>) => void;
  onDelete: () => void;
}) {
  const [color, setColor] = useState(variant.color ?? "");
  const [colorHex, setColorHex] = useState(variant.color_hex ?? "#000000");
  const [stockQty, setStockQty] = useState(variant.stock_qty ?? 0);
  const [imageUrl, setImageUrl] = useState(variant.image_url ?? "");

  const isDirty =
    color !== (variant.color ?? "") ||
    colorHex !== (variant.color_hex ?? "#000000") ||
    stockQty !== (variant.stock_qty ?? 0) ||
    imageUrl !== (variant.image_url ?? "");

  const tdClass = "px-3 py-2";

  return (
    <tr className="border-b last:border-0">
      <td className={tdClass}>
        <Input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 text-xs"
          placeholder="Ex: Preto"
        />
      </td>
      <td className={tdClass}>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer p-0.5"
          />
          <Input
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="h-8 text-xs w-24 font-mono"
          />
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">{variant.size}</td>
      <td className={tdClass}>
        <Input
          type="number"
          min={0}
          value={stockQty}
          onChange={(e) => setStockQty(parseInt(e.target.value || "0", 10))}
          className="h-8 text-xs w-20"
        />
      </td>
      <td className={tdClass}>
        <Input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="h-8 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {isDirty && (
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isSaving}
              onClick={() => onSave({ color, color_hex: colorHex, stock_qty: stockQty, image_url: imageUrl || null })}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}
