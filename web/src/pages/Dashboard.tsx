import { useAuthStore } from "@/stores/useAuthStore";
import { useTenant } from "@/providers/TenantProvider";
import { useLogout } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const tenant = useTenant();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{tenant.tenantName}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.full_name}</span>
          <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
            Logout
          </Button>
        </div>
      </header>
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user?.full_name?.split(" ")[0]}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This is a template dashboard. Build your application from here.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
