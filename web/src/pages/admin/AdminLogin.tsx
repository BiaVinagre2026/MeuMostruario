import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperatorLogin } from "@/hooks/useOperatorAuth";
import { useOperatorStore } from "@/stores/useOperatorStore";
import type { Operator } from "@/types/operator";
import { resolveTenantSlugFromHost } from "@/lib/tenantContext";

// Terceira copia da mesma logica no projeto, agora unificada: abrindo pelo IP
// da rede (o caminho do celular) o "192" era tomado como tenant, o campo de
// slug sumia do formulario e o login ia com tenant inexistente.
function detectTenantSlug(): string {
  return resolveTenantSlugFromHost(window.location.hostname) ?? "";
}

export function getAdminHome(role?: Operator["role"]): string {
  return role === "super_admin" ? "/admin/global" : "/admin/dashboard";
}

const adminLoginSchema = z.object({
  email: z.string().min(1, "Email obrigatório.").email("Email inválido."),
  password: z.string().min(6, "Mínimo 6 caracteres."),
  tenantSlug: z.string().optional(),
});

type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export default function AdminLogin() {
  const { mutate: login, isPending } = useOperatorLogin();
  const isAuthenticated = useOperatorStore((s) => s.isAuthenticated);
  const isLoading = useOperatorStore((s) => s.isLoading);
  const operatorRole = useOperatorStore((s) => s.operator?.role);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const detectedSlug = detectTenantSlug();
  const showTenantField = !detectedSlug;
  const adminHome = getAdminHome(operatorRole);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(adminHome, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, adminHome]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "", tenantSlug: detectedSlug },
    mode: "onBlur",
  });

  function onSubmit(values: AdminLoginValues) {
    login(
      { ...values, tenantSlug: values.tenantSlug || detectedSlug || undefined },
      {
        onSuccess: (operator) => {
          navigate(getAdminHome(operator.role), { replace: true });
        },
      }
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Painel White-Label</CardTitle>
          <CardDescription>
            Entre como admin do tenant ou super-admin global
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {showTenantField && (
              <div className="space-y-2">
                <Label htmlFor="tenantSlug">
                  Slug do tenant <span className="text-muted-foreground text-xs">(ex: demo)</span>
                </Label>
                <Input
                  id="tenantSlug"
                  placeholder="demo"
                  autoComplete="off"
                  disabled={isPending}
                  {...register("tenantSlug")}
                />
                <p className="text-xs text-muted-foreground">
                  Preencha para entrar em uma operação específica ou deixe em branco para o painel global.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                disabled={isPending}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={isPending}
                  className="pr-11"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((atual) => !atual)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  // 44px: no celular digitar senha errada e comum, e o alvo
                  // precisa ser tocavel sem acertar o campo por engano.
                  className="absolute right-0 top-0 h-full w-11 grid place-items-center text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar ao site
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
