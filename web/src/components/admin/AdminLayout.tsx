import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Package, BookOpen, ShoppingBag, Settings, LogOut, Menu, X, LayoutDashboard, Users, Images, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOperatorStore } from "@/stores/useOperatorStore";
import { useOperatorLogout } from "@/hooks/useOperatorAuth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/admin/dashboard",   icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Fotos",         href: "/admin/photo-batches", icon: <Images        className="h-4 w-4" /> },
  { label: "Catálogos",     href: "/admin/catalogs",    icon: <Link2          className="h-4 w-4" /> },
  { label: "Produtos",      href: "/admin/products",    icon: <Package         className="h-4 w-4" /> },
  { label: "Coleções",      href: "/admin/collections", icon: <BookOpen        className="h-4 w-4" /> },
  { label: "Compradores",   href: "/admin/members",     icon: <Users           className="h-4 w-4" /> },
  { label: "Pedidos",       href: "/admin/orders",      icon: <ShoppingBag     className="h-4 w-4" /> },
  { label: "Configurações", href: "/admin/settings",    icon: <Settings        className="h-4 w-4" /> },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const operator  = useOperatorStore((s) => s.operator);
  const logout    = useOperatorLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) => location.pathname.startsWith(href);

  const navLinkClass = (href: string) =>
    [
      "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
      isActive(href)
        ? "bg-primary text-primary-foreground font-medium"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    ].join(" ");

  const SidebarContent = () => (
    <>
      <div className="px-4 py-5 border-b flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm tracking-wide">MeuMostruário</span>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">Admin da fábrica</p>
        </div>
        {/* Fechar drawer no mobile */}
        <button
          className="md:hidden text-muted-foreground"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={navLinkClass(item.href)}
            onClick={() => setDrawerOpen(false)}
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
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Sidebar desktop (md+) ── */}
      <aside className="hidden md:flex w-56 border-r bg-muted/30 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Drawer overlay mobile ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="flex flex-col w-64 h-full bg-background border-r"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar mobile com hamburger */}
        <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-muted-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">MeuMostruário</span>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground text-xs"
              onClick={() => navigate("/")}
            >
              Ver showroom
            </Button>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
