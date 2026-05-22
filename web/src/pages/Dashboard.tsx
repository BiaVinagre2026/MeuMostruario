import { useAuthStore } from "@/stores/useAuthStore";
import { useTenant } from "@/providers/TenantProvider";
import { useLogout } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const tenant = useTenant();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{tenant.tenantName}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.full_name}</span>
          <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
            Sair
          </Button>
        </div>
      </header>
      <main className="p-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Olá, {user?.full_name?.split(" ")[0]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Esta é a sua área de comprador deste tenant. A partir daqui você pode acessar o catálogo,
              montar pedidos e compartilhar links com a sua equipe.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/catalog")}>
                Abrir catálogo
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Voltar ao início
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
