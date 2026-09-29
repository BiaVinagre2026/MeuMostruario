import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImageOff, Loader2, Save, Store } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  getMareCoralStorefront,
  updateMareCoralStorefront,
  type MareCoralStorefrontProduct,
} from "@/lib/api/mareCoralRetail";

const QUERY_KEY = ["admin", "mare-coral-storefront"] as const;

function brl(value: string | number | null) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "Preço pendente";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
}

export default function MareCoralStorefront() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: QUERY_KEY, queryFn: getMareCoralStorefront });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (data) setSelectedIds(data.products.filter((product) => product.selected).map((product) => product.id));
  }, [data]);

  const productsById = useMemo(
    () => new Map((data?.products ?? []).map((product) => [product.id, product])),
    [data]
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const orderedProducts = useMemo(() => {
    const selected = selectedIds.map((id) => productsById.get(id)).filter(Boolean) as MareCoralStorefrontProduct[];
    const available = (data?.products ?? []).filter((product) => !selectedSet.has(product.id));
    return [...selected, ...available];
  }, [data, productsById, selectedIds, selectedSet]);

  const mutation = useMutation({
    mutationFn: () => updateMareCoralStorefront(selectedIds),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEY, updated);
      toast.success("Vitrine da loja atualizada.");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar a vitrine."),
  });

  function toggle(product: MareCoralStorefrontProduct) {
    if (!product.eligible && !selectedSet.has(product.id)) return;
    setSelectedIds((current) => current.includes(product.id)
      ? current.filter((id) => id !== product.id)
      : [...current, product.id]);
  }

  function move(productId: number, direction: -1 | 1) {
    setSelectedIds((current) => {
      const from = current.indexOf(productId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  return (
    <AdminLayout>
      <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold"><Store className="h-5 w-5" /> Vitrine da loja</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha o que aparece no site da Maré Coral e organize a ordem de exibição.</p>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || isLoading || !!error}>
          {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Salvar vitrine
        </Button>
      </header>

      <main className="space-y-4 px-4 py-5 md:px-6">
        {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Não foi possível abrir a vitrine varejista. Confirme se o catálogo principal da Maré Coral está ativo.
          </div>
        )}
        {data && (
          <>
            <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <span><strong>{selectedIds.length}</strong> produto{selectedIds.length === 1 ? "" : "s"} na loja</span>
              <span className="text-xs text-muted-foreground">Catálogo: {data.catalog.name}</span>
            </section>

            {orderedProducts.length === 0 ? (
              <div className="rounded-lg border py-16 text-center">
                <p className="font-medium">Nenhum produto publicado</p>
                <p className="mt-1 text-sm text-muted-foreground">Publique um produto para ele aparecer nesta lista.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orderedProducts.map((product) => {
                  const selected = selectedSet.has(product.id);
                  const position = selectedIds.indexOf(product.id);
                  return (
                    <article key={product.id} className={`rounded-lg border p-3 transition-colors ${selected ? "border-primary/40 bg-primary/5" : "bg-background"}`}>
                      <div className="flex items-start gap-3">
                        <label className="mt-4 flex cursor-pointer items-center" title={product.eligible ? "Mostrar ou ocultar na loja" : product.eligibility_reasons.join(". ")}>
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-primary"
                            checked={selected}
                            disabled={!product.eligible && !selected}
                            onChange={() => toggle(product)}
                            aria-label={`${selected ? "Ocultar" : "Mostrar"} ${product.name} na loja`}
                          />
                        </label>
                        <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {product.cover_url ? <img src={product.cover_url} alt="" className="h-full w-full object-cover object-top" /> : <ImageOff className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h2 className="font-medium leading-tight">{product.name}</h2>
                              <p className="mt-1 text-xs text-muted-foreground">{product.sku || "Sem SKU"} · {brl(product.price_retail)}</p>
                            </div>
                            {selected && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">{position + 1}º na loja</span>}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">{product.variants_count} variaç{product.variants_count === 1 ? "ão" : "ões"} · {product.stock_qty} unidade{product.stock_qty === 1 ? "" : "s"} em estoque</p>
                          {!product.eligible && (
                            <p className="mt-1 text-xs font-medium text-amber-700">Antes de incluir: {product.eligibility_reasons.join("; ").toLocaleLowerCase("pt-BR")}.</p>
                          )}
                        </div>
                        {selected && (
                          <div className="flex shrink-0 flex-col gap-1">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => move(product.id, -1)} disabled={position === 0} aria-label={`Subir ${product.name}`}><ArrowUp className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => move(product.id, 1)} disabled={position === selectedIds.length - 1} aria-label={`Descer ${product.name}`}><ArrowDown className="h-4 w-4" /></Button>
                          </div>
                        )}
                      </div>
                      {!product.eligible && (
                        <div className="mt-2 border-t pt-2 text-right"><Link className="text-xs font-medium text-primary hover:underline" to={`/admin/products/${product.id}/edit`}>Completar produto</Link></div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </AdminLayout>
  );
}
