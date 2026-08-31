import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

import { TenantProvider } from "@/providers/TenantProvider";
import AuthProvider from "@/components/auth/AuthProvider";
import OperatorAuthProvider from "@/components/auth/OperatorAuthProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import TenantAdminRoute from "@/components/auth/TenantAdminRoute";

import { ShowroomLayout } from "@/components/showroom/ShowroomLayout";
import { useOperatorStore } from "@/stores/useOperatorStore";

const Home = lazy(() => import("@/pages/Home"));
const Catalog = lazy(() => import("@/pages/Catalog"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const CatalogLinkPage = lazy(() => import("@/pages/CatalogLinkPage"));
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const ProductList = lazy(() => import("@/pages/admin/products/ProductList"));
const ProductForm = lazy(() => import("@/pages/admin/products/ProductForm"));
const CollectionList = lazy(() => import("@/pages/admin/collections/CollectionList"));
const CollectionForm = lazy(() => import("@/pages/admin/collections/CollectionForm"));
const MemberList = lazy(() => import("@/pages/admin/members/MemberList"));
const OrderList = lazy(() => import("@/pages/admin/orders/OrderList"));
const OrderDetail = lazy(() => import("@/pages/admin/orders/OrderDetail"));
const SettingsPage = lazy(() => import("@/pages/admin/settings/SettingsPage"));
const PhotoBatchList = lazy(() => import("@/pages/admin/photos/PhotoBatchList"));
const PhotoBatchReview = lazy(() => import("@/pages/admin/photos/PhotoBatchReview"));
const CatalogList = lazy(() => import("@/pages/admin/catalogs/CatalogList"));
const GlobalDashboard = lazy(() => import("@/pages/admin/global/GlobalDashboard"));
const TenantListPage = lazy(() => import("@/pages/admin/global/TenantListPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AdminHomeRedirect() {
  const role = useOperatorStore((state) => state.operator?.role);
  return <Navigate to={role === "super_admin" ? "/admin/global" : "/admin/dashboard"} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <TooltipProvider>
          <AuthProvider>
            <OperatorAuthProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route element={<ShowroomLayout />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/catalog" element={<Catalog />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                    </Route>
                    <Route path="/link/:token" element={<CatalogLinkPage />} />

                    <Route path="/login" element={<Login />} />
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                    </Route>

                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminHomeRedirect />} />
                      <Route path="/admin/global" element={<GlobalDashboard />} />
                      <Route path="/admin/global/tenants" element={<TenantListPage />} />
                      <Route element={<TenantAdminRoute />}>
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />

                        <Route path="/admin/products" element={<ProductList />} />
                        <Route path="/admin/products/new" element={<ProductForm />} />
                        <Route path="/admin/products/:id/edit" element={<ProductForm />} />

                        <Route path="/admin/photo-batches" element={<PhotoBatchList />} />
                        <Route path="/admin/photo-batches/:id" element={<PhotoBatchReview />} />
                        <Route path="/admin/catalogs" element={<CatalogList />} />

                        <Route path="/admin/collections" element={<CollectionList />} />
                        <Route path="/admin/collections/new" element={<CollectionForm />} />
                        <Route path="/admin/collections/:id/edit" element={<CollectionForm />} />

                        <Route path="/admin/members" element={<MemberList />} />

                        <Route path="/admin/orders" element={<OrderList />} />
                        <Route path="/admin/orders/:id" element={<OrderDetail />} />

                        <Route path="/admin/settings" element={<SettingsPage />} />
                      </Route>
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <Toaster />
              </BrowserRouter>
            </OperatorAuthProvider>
          </AuthProvider>
        </TooltipProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}

function RouteFallback() {
  return (
    <main className="min-h-screen grid place-items-center bg-background px-6">
      <div className="text-sm text-muted-foreground">Carregando interface...</div>
    </main>
  );
}
