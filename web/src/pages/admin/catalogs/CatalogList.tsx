import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { createCatalogLink, getCatalogs } from "@/lib/api/photoCatalog";
import type { Catalog } from "@/types/photoCatalog";

export default function CatalogList() {
  const queryClient = useQueryClient();
  const { data: catalogs = [], isLoading } = useQuery({
    queryKey: ["admin", "catalogs"],
    queryFn: getCatalogs,
  });

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

  return (
    <AdminLayout>
      <div className="px-6 py-5 border-b">
        <h1 className="text-xl font-semibold">Catalogos e links</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie links publicos sem preco e links de atacado com pedido/pagamento.
        </p>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : catalogs.length === 0 ? (
          <div className="border rounded-lg p-8 text-sm text-muted-foreground">
            Nenhum catalogo ainda. Gere um catalogo a partir de um lote de fotos revisado.
          </div>
        ) : (
          <div className="grid gap-4">
            {catalogs.map((catalog) => (
              <section key={catalog.id} className="border rounded-lg p-5 bg-background">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{catalog.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{catalog.items_count} itens · {catalog.status}</p>
                  </div>
                  <div className="flex gap-2">
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
