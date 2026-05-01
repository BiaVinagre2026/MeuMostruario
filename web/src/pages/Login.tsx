import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/showroom/primitives";
import { useLogin } from "@/hooks/useAuth";
import { useTenant } from "@/providers/TenantProvider";
import { maskCpf, unmaskCpf } from "@/lib/masks";

export default function Login() {
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const login = useLogin();
  const tenant = useTenant();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { cpf: unmaskCpf(cpf), password },
      { onSuccess: () => navigate("/catalog", { replace: true }) }
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--brand-background)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
          <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center" }}>
            <Logo size={22}/>
          </button>
        </div>

        <div style={{ border: "1px solid var(--brand-border)", background: "white", padding: "40px 40px" }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Área do lojista</div>
          <h1 className="display" style={{ fontSize: 36, marginBottom: 4 }}>{tenant.tenantName}</h1>
          <p style={{ fontSize: 13, color: "var(--brand-muted)", marginBottom: 32 }}>
            Acesso restrito a parceiros B2B cadastrados.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                CPF
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                required
                style={{
                  width: "100%", padding: "12px 14px",
                  border: "1px solid var(--brand-border)",
                  fontFamily: "var(--font-mono)", fontSize: 14,
                  background: "white", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%", padding: "12px 14px",
                  border: "1px solid var(--brand-border)",
                  fontFamily: "var(--font-mono)", fontSize: 14,
                  background: "white", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {login.isError && (
              <p style={{ fontSize: 12, color: "#ef4444" }}>CPF ou senha incorretos. Tente novamente.</p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              style={{
                marginTop: 8, padding: "14px 24px",
                background: "var(--brand-foreground)", color: "white",
                fontFamily: "var(--font-mono)", fontSize: 11,
                letterSpacing: "0.14em", textTransform: "uppercase",
                border: "none", cursor: login.isPending ? "not-allowed" : "pointer",
                opacity: login.isPending ? 0.7 : 1,
              }}
            >
              {login.isPending ? "Entrando…" : "Entrar no catálogo"}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--brand-border)", fontSize: 12, color: "var(--brand-muted)" }}>
            Ainda não é parceiro?{" "}
            <button style={{ borderBottom: "1px solid var(--brand-muted)", fontSize: 12 }}>
              Solicite acesso
            </button>
          </div>
        </div>

        {/* Admin link */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            onClick={() => navigate("/admin/login")}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-muted)" }}
          >
            Área administrativa →
          </button>
        </div>
      </div>
    </div>
  );
}
