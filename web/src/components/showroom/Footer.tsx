import { useNavigate } from "react-router-dom";
import { Logo, Btn } from "./primitives";
import { Icons } from "./icons";
import { TENANT, COLLECTIONS } from "@/data/catalog";

export function Footer() {
  const navigate = useNavigate();
  const cols = [
    { title: "Vendas",    items: ["Como comprar", "Pedido mínimo", "Formas de pagamento", "Representantes", "Devoluções"] },
    { title: "Coleções",  items: COLLECTIONS.map(c => c.name) },
    { title: "Atelier",   items: ["Sobre", "Processo", "Matérias-primas", "Sustentabilidade", "Contato"] },
  ];

  return (
    <footer style={{ background: "var(--brand-foreground)", color: "white", padding: "80px 32px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, maxWidth: 1440, margin: "0 auto" }}>
        <div>
          <Logo size={28}/>
          <p className="display" style={{ fontSize: 40, lineHeight: 1, marginTop: 32, maxWidth: 380 }}>
            Moda feita em <em>pequenos lotes</em>, para multimarcas curadas.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <Btn variant="accent" icon={<Icons.Whats/>}
              onClick={() => alert("Abre WhatsApp: " + TENANT.whatsapp)}>
              Falar com o atacado
            </Btn>
          </div>
        </div>
        {cols.map(c => (
          <div key={c.title}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5, marginBottom: 20 }}>
              {c.title}
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {c.items.map(i => <li key={i} style={{ fontSize: 14 }}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{
        maxWidth: 1440, margin: "64px auto 0", paddingTop: 24,
        borderTop: "1px solid rgba(255,255,255,0.15)",
        display: "flex", justifyContent: "space-between",
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5,
      }}>
        <span>{TENANT.name} Atelier · {TENANT.cnpj}</span>
        <span>São Paulo · Brasil</span>
        <span>Powered by Mostruário — SaaS white-label</span>
      </div>
    </footer>
  );
}
