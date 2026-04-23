import { useOperatorStore } from "@/stores/useOperatorStore";
import { useOperatorLogout } from "@/hooks/useOperatorAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const operator = useOperatorStore((s) => s.operator);
  const logout = useOperatorLogout();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {operator?.name} ({operator?.role})
          </span>
          <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
            Logout
          </Button>
        </div>
      </header>
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {operator?.name?.split(" ")[0]}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This is the admin template dashboard. Build your admin panel from here.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
