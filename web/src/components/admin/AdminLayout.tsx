import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, BookOpen, ShoppingBag, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOperatorStore } from "@/stores/useOperatorStore";
import { useOperatorLogout } from "@/hooks/useOperatorAuth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Produtos",
    href: "/admin/products",
    icon: <Package className="h-4 w-4" />,
  },
  {
    label: "Coleções",
    href: "/admin/collections",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    label: "Pedidos",
    href: "/admin/orders",
    icon: <ShoppingBag className="h-4 w-4" />,
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const operator = useOperatorStore((s) => s.operator);
  const logout = useOperatorLogout();

  function isActive(href: string): boolean {
    if (href === "/admin/dashboard") return location.pathname === href;
    return location.pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/30 flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b">
          <span className="font-semibold text-sm tracking-wide">MeuMostruário</span>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">Admin</p>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={[
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              ].join(" ")}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t space-y-2">
          <p className="text-xs text-muted-foreground truncate">{operator?.name}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => logout.mutate()}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
