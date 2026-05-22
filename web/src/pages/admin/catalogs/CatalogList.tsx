import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCatalogLink, getCatalogs, updateCatalog } from "@/lib/api/photoCatalog";
import type { Catalog } from "@/types/photoCatalog";

export default function CatalogList() {
  const queryClient = useQueryClient();
  const [filterSku, setFilterSku] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLinkType, setFilterLinkType] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated_desc");
  const { data: catalogs = [], isLoading } = useQuery({
    queryKey: ["admin", "catalogs"],
    queryFn: getCatalogs,
  });
  const hasActiveFilters = filterSku !== "all" || filterStatus !== "all" || filterLinkType !== "all" || search.trim().length > 0 || sortBy !== "updated_desc";

  const skuOptions = useMemo(
    () => Array.from(new Set(catalogs.flatMap((catalog) => catalog.summary?.sku_labels ?? []))).sort(),
    [catalogs]
  );
  const filteredCatalogs = useMemo(() => {
    const result = catalogs.filter((catalog) => {
        if (filterSku !== "all" && !(catalog.summary?.sku_labels ?? []).includes(filterSku)) return false;
        if (filterStatus !== "all" && catalog.status !== filterStatus) return false;
        if (filterLinkType !== "all" && !catalog.links.some((link) => link.link_type === filterLinkType)) return false;
        if (search.trim()) {
          const haystack = [
            catalog.name,
            catalog.description,
            ...(catalog.summary?.sku_labels ?? []),
            ...(catalog.summary?.model_labels ?? []),
            ...(catalog.summary?.color_labels ?? []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(search.trim().toLowerCase())) return false;
        }
        return true;
      });

    result.sort((left, right) => {
      switch (sortBy) {
        case "updated_asc":
          return left.updated_at.localeCompare(right.updated_at);
        case "items_desc":
          return right.items_count - left.items_count;
        case "items_asc":
          return left.items_count - right.items_count;
        case "name_asc":
          return left.name.localeCompare(right.name);
        case "name_desc":
          return right.name.localeCompare(left.name);
        case "updated_desc":
        default:
          return right.updated_at.localeCompare(left.updated_at);
      }
    });

    return result;
  }, [catalogs, filterLinkType, filterSku, filterStatus, search, sortBy]);

  function resetFilters() {
    setFilterSku("all");
    setFilterStatus("all");
    setFilterLinkType("all");
    setSearch("");
    setSortBy("updated_desc");
  }

  const linkMutation = useMutation({
    mutationFn: ({ catalog, wholesale }: { catalog: Catalog; wholesale: boolean }) =>
      createCatalogLink(catalog.id, wholesale
        ? { link_type: "wholesale_buyer", show_prices: true, allow_order: true, allow_payment: true }
        : { link_type: "public_client" }),
    onSuccess: () => {
      toast.success("Link criado.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "catalogs"] });
    },
    onError: () => toast.error("Nao foi possivel criar o link."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ catalog, status }: { catalog: Catalog; status: Catalog["status"] }) =>
      updateCatalog(catalog.id, {
        catalog: {
          name: catalog.name,
          description: catalog.description ?? undefined,
          source: catalog.source,
          status,
        },
      }),
    onSuccess: () => {
      toast.success("Status do catalogo atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "catalogs"] });
    },
    onError: () => toast.error("Nao foi possivel atualizar o status do catalogo."),
  });

  function renderStatusActions(catalog: Catalog) {
    const isPending = statusMutation.isPending && statusMutation.variables?.catalog.id === catalog.id;

    if (catalog.status === "draft") {
      return (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => statusMutation.mutate({ catalog, status: "published" })}
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Publicar
        </Button>
      );
    }

    if (catalog.status === "published") {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => statusMutation.mutate({ catalog, status: "archived" })}
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Arquivar
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => statusMutation.mutate({ catalog, status: "draft" })}
      >
        {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
        Voltar para draft
      </Button>
    );
  }

  return (
    <AdminLayout>
      <div className="px-6 py-5 border-b">
        <h1 className="text-xl font-semibold">Catalogos e links</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie links publicos sem preco e links de atacado com pedido/pagamento.
        </p>
      </div>

      <div className="p-6 space-y-6">
        <section className="border rounded-lg p-4 bg-background">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <label className="text-xs text-muted-foreground">Buscar</label>
              <Input
                aria-label="Buscar catalogos"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="SKU, modelo ou nome"
              />
            </div>
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
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Filtrar status</label>
              <select
                aria-label="Filtrar status"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="all">Todos</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="w-48">
              <label className="text-xs text-muted-foreground">Filtrar tipo de link</label>
              <select
                aria-label="Filtrar tipo de link"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterLinkType}
                onChange={(event) => setFilterLinkType(event.target.value)}
              >
                <option value="all">Todos</option>
                <option value="public_client">Publico</option>
                <option value="wholesale_buyer">Atacado</option>
                <option value="selection">Selecao</option>
              </select>
            </div>
            <div className="w-44">
              <label className="text-xs text-muted-foreground">Ordenar</label>
              <select
                aria-label="Ordenar catalogos"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="updated_desc">Mais recentes</option>
                <option value="updated_asc">Mais antigos</option>
                <option value="items_desc">Mais itens</option>
                <option value="items_asc">Menos itens</option>
                <option value="name_asc">Nome A-Z</option>
                <option value="name_desc">Nome Z-A</option>
              </select>
            </div>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" className="mb-0.5" onClick={resetFilters}>
                Limpar filtros
              </Button>
            )}
            <div className="pb-2 text-xs text-muted-foreground">
              {filteredCatalogs.length} catalogo(s)
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : filteredCatalogs.length === 0 ? (
          <div className="border rounded-lg p-8 text-sm text-muted-foreground">
            Nenhum catalogo encontrado para os filtros aplicados.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCatalogs.map((catalog) => (
              <section key={catalog.id} className="border rounded-lg p-5 bg-background">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{catalog.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {catalog.items_count} itens · {catalog.status} · {catalog.source}
                    </p>
                    {catalog.description && (
                      <p className="text-sm text-muted-foreground mt-1">{catalog.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {catalog.summary?.sku_labels?.map((sku) => (
                        <span key={sku} className="rounded-md border px-2 py-1">{sku}</span>
                      ))}
                      {catalog.summary?.model_labels?.map((model) => (
                        <span key={model} className="rounded-md border px-2 py-1">{model}</span>
                      ))}
                      {catalog.summary?.color_labels?.map((color) => (
                        <span key={color} className="rounded-md border px-2 py-1">{color}</span>
                      ))}
                      {catalog.summary?.size_groups?.map((sizeGroup) => (
                        <span key={sizeGroup} className="rounded-md border px-2 py-1">{sizeGroup}</span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {catalog.summary?.public_links_count ?? 0} link(s) publico(s) · {catalog.summary?.wholesale_links_count ?? 0} link(s) atacado
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {renderStatusActions(catalog)}
                    <Button size="sm" variant="outline" onClick={() => linkMutation.mutate({ catalog, wholesale: false })}>
                      {linkMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
                      Link publico
                    </Button>
                    <Button size="sm" onClick={() => linkMutation.mutate({ catalog, wholesale: true })}>
                      <Link2 className="h-4 w-4 mr-1" />
                      Link atacado
                    </Button>
                  </div>
                </div>

                {catalog.links.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {catalog.links.map((link) => {
                      const url = `${window.location.origin}/link/${link.token}`;
                      return (
                        <button
                          key={link.id}
                          className="flex items-center justify-between gap-3 border rounded-md px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => void navigator.clipboard.writeText(url)}
                        >
                          <span className="truncate">{url}</span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {link.link_type}
                            <Copy className="h-4 w-4" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
