import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, Building2, Globe2, Images, LayoutDashboard, Link2, LogOut, Menu, Package, Settings, ShoppingBag, Store, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenantWorkspaceTabs } from "@/components/admin/TenantWorkspaceTabs";
import { useOperatorStore } from "@/stores/useOperatorStore";
import { useOperatorLogout } from "@/hooks/useOperatorAuth";
import { PLATFORM_NAME } from "@/lib/platformBranding";
import { adminStorefrontUrl } from "@/lib/adminStorefrontUrl";
import { useTenant } from "@/providers/TenantProvider";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const TENANT_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Fotos", href: "/admin/photo-batches", icon: <Images className="h-4 w-4" /> },
  { label: "Catálogos", href: "/admin/catalogs", icon: <Link2 className="h-4 w-4" /> },
  { label: "Produtos", href: "/admin/products", icon: <Package className="h-4 w-4" /> },
  { label: "Coleções", href: "/admin/collections", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Compradores", href: "/admin/members", icon: <Users className="h-4 w-4" /> },
  { label: "Pedidos", href: "/admin/orders", icon: <ShoppingBag className="h-4 w-4" /> },
  { label: "Configurações", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
];

const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Painel global", href: "/admin/global", icon: <Globe2 className="h-4 w-4" /> },
  { label: "Tenants", href: "/admin/global/tenants", icon: <Building2 className="h-4 w-4" /> },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const tenant = useTenant();
  const operator = useOperatorStore((s) => s.operator);
  const activeTenantSlug = useOperatorStore((s) => s.activeTenantSlug);
  const logout = useOperatorLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isSuperAdmin = operator?.role === "super_admin";
  const isGlobalWorkspace = location.pathname === "/admin/global" || location.pathname.startsWith("/admin/global/");
  const workspaceSlug = isGlobalWorkspace ? null : activeTenantSlug;
  const storefrontUrl = adminStorefrontUrl(tenant.companyWebsite, workspaceSlug);
  const brandName = isSuperAdmin ? PLATFORM_NAME : tenant.tenantName;
  const mareCoralNavItems = workspaceSlug === "mare-coral"
    ? [{ label: "Vitrine da loja", href: "/admin/storefront", icon: <Store className="h-4 w-4" /> }]
    : [];
  const tenantNavItems = [
    ...TENANT_NAV_ITEMS.slice(0, 3),
    ...mareCoralNavItems,
    ...TENANT_NAV_ITEMS.slice(3),
  ];
  const navItems = isSuperAdmin
    ? workspaceSlug
      ? [...SUPER_ADMIN_NAV_ITEMS, ...tenantNavItems]
      : SUPER_ADMIN_NAV_ITEMS
    : tenantNavItems;

  const isActive = (href: string) =>
    href === "/admin/global"
      ? location.pathname === href
      : location.pathname.startsWith(href);

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
          <span className="font-semibold text-sm tracking-wide">{brandName}</span>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {isSuperAdmin && !workspaceSlug
              ? "Painel global white-label"
              : `Cliente ativo: ${workspaceSlug ?? operator?.tenant_slug ?? "—"}`}
          </p>
        </div>
        <button
          className="md:hidden text-muted-foreground"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map((item) => (
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
        {workspaceSlug && storefrontUrl && (
          <a
            className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Store className="h-3.5 w-3.5" />
            Abrir loja varejista
          </a>
        )}
        {workspaceSlug && (
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Store className="h-3 w-3" />
            {workspaceSlug}
          </div>
        )}
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
      <aside className="hidden md:flex w-56 border-r bg-muted/30 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="flex flex-col w-64 h-full bg-background border-r"
            onClick={(event) => event.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-muted-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="min-w-0 font-semibold text-sm leading-tight">
            {brandName}{workspaceSlug ? ` · ${workspaceSlug}` : ""}
          </span>
          {workspaceSlug && storefrontUrl && (
            <a className="ml-auto shrink-0 text-xs text-muted-foreground" href={storefrontUrl} target="_blank" rel="noreferrer">Ver loja</a>
          )}
        </div>

        {isSuperAdmin && <TenantWorkspaceTabs />}
        {children}
      </div>
    </div>
  );
}
