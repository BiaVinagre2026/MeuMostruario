import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperatorLogin } from "@/hooks/useOperatorAuth";
import { useOperatorStore } from "@/stores/useOperatorStore";

function detectTenantSlug(): string {
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 2) {
    const slug = parts[0];
    if (slug && !["www", "api", "admin", "app", "localhost"].includes(slug)) {
      return slug;
    }
  }
  return "";
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

  const detectedSlug = detectTenantSlug();
  const showTenantField = !detectedSlug;

  const adminHome = operatorRole === "super_admin" ? "/admin/global" : "/admin/dashboard";

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
          const dest = operator.role === "super_admin" ? "/admin/global" : "/admin/dashboard";
          navigate(dest, { replace: true });
        },
      }
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Painel Administrativo</CardTitle>
          <CardDescription>Entre com sua conta de operador</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {showTenantField && (
              <div className="space-y-2">
                <Label htmlFor="tenantSlug">
                  Slug do tenant{" "}
                  <span className="text-muted-foreground text-xs">(ex: demo)</span>
                </Label>
                <Input
                  id="tenantSlug"
                  placeholder="demo"
                  autoComplete="off"
                  disabled={isPending}
                  {...register("tenantSlug")}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para login de super-admin.
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
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={isPending}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
