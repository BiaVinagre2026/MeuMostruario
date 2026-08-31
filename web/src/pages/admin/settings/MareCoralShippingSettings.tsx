import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Save, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  getMareCoralRetailSettings,
  updateMareCoralRetailSettings,
} from "@/lib/api/mareCoralRetail";

export default function MareCoralShippingSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "mare-coral-retail-settings"],
    queryFn: getMareCoralRetailSettings,
  });

  const [enabled, setEnabled] = useState(false);
  const [flatRate, setFlatRate] = useState("");
  const [freeThreshold, setFreeThreshold] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("7");
  const [originPostalCode, setOriginPostalCode] = useState("");

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setFlatRate(data.flat_rate ?? "");
    setFreeThreshold(data.free_shipping_threshold ?? "");
    setEstimatedDays(String(data.estimated_days || 7));
    setOriginPostalCode(data.origin_postal_code ?? "");
  }, [data]);

  const mutation = useMutation({
    mutationFn: updateMareCoralRetailSettings,
    onSuccess: () => {
      toast.success("Regra de entrega salva.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "mare-coral-retail-settings"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar."),
  });

  function save() {
    mutation.mutate({
      enabled,
      flat_rate: flatRate.trim() || null,
      free_shipping_threshold: freeThreshold.trim() || null,
      estimated_days: Number(estimatedDays) || 7,
      origin_postal_code: originPostalCode.replace(/\D/g, "") || null,
    });
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        A vitrine varejista da Maré Coral ainda não foi marcada no catálogo. Ative a integração antes de definir o frete.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Entrega do site Maré Coral</p>
          <p className="text-xs text-muted-foreground">A regra vale somente para a vitrine varejista autorizada.</p>
        </div>
        <Button onClick={save} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Salvar
        </Button>
      </div>

      <section className="overflow-hidden rounded-lg border">
        <div className="flex items-center gap-2.5 border-b bg-muted/40 px-5 py-3">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Frete nacional</h2>
        </div>
        <div className="space-y-5 px-5 py-5">
          <label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              <strong className="flex items-center gap-1.5 text-sm"><CheckCircle2 className="h-4 w-4" /> Calcular frete no checkout</strong>
              <span className="mt-1 block text-xs text-muted-foreground">Enquanto estiver desligado, o pedido é salvo e o frete fica a combinar. O pagamento online permanece protegido.</span>
            </span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Valor fixo nacional" hint="Ex.: 24,90">
              <Input value={flatRate} onChange={(event) => setFlatRate(event.target.value)} inputMode="decimal" placeholder="24,90" />
            </Field>
            <Field label="Frete grátis a partir de" hint="Deixe vazio para não oferecer">
              <Input value={freeThreshold} onChange={(event) => setFreeThreshold(event.target.value)} inputMode="decimal" placeholder="299,00" />
            </Field>
            <Field label="Prazo estimado" hint="Dias úteis de transporte">
              <Input type="number" min={1} max={90} value={estimatedDays} onChange={(event) => setEstimatedDays(event.target.value)} />
            </Field>
            <Field label="CEP de origem" hint="Usado na futura integração com transportadoras">
              <Input value={originPostalCode} onChange={(event) => setOriginPostalCode(event.target.value)} inputMode="numeric" maxLength={9} placeholder="00000-000" />
            </Field>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            A postagem continua prevista em até 2 dias úteis. O prazo acima corresponde ao transporte depois da postagem.
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}
