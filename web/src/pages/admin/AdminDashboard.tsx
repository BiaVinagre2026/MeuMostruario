import { useOperatorStore } from "@/stores/useOperatorStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminDashboard() {
  const operator = useOperatorStore((s) => s.operator);

  return (
    <AdminLayout>
      <div className="px-6 py-4 border-b">
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo, {operator?.name?.split(" ")[0]}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Gerencie os produtos e coleções do seu mostruário no menu lateral.
            </p>
          </CardContent>
        </Card>
      </main>
    </AdminLayout>
  );
}
