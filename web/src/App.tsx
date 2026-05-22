import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

import { TenantProvider } from "@/providers/TenantProvider";
import AuthProvider from "@/components/auth/AuthProvider";
import OperatorAuthProvider from "@/components/auth/OperatorAuthProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";

import { ShowroomLayout } from "@/components/showroom/ShowroomLayout";

import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import CatalogLinkPage from "@/pages/CatalogLinkPage";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ProductList from "@/pages/admin/products/ProductList";
import ProductForm from "@/pages/admin/products/ProductForm";
import CollectionList from "@/pages/admin/collections/CollectionList";
import CollectionForm from "@/pages/admin/collections/CollectionForm";
import MemberList from "@/pages/admin/members/MemberList";
import OrderList from "@/pages/admin/orders/OrderList";
import OrderDetail from "@/pages/admin/orders/OrderDetail";
import SettingsPage from "@/pages/admin/settings/SettingsPage";
import PhotoBatchList from "@/pages/admin/photos/PhotoBatchList";
import PhotoBatchReview from "@/pages/admin/photos/PhotoBatchReview";
import CatalogList from "@/pages/admin/catalogs/CatalogList";
import GlobalDashboard from "@/pages/admin/global/GlobalDashboard";
import TenantListPage from "@/pages/admin/global/TenantListPage";
import { useOperatorStore } from "@/stores/useOperatorStore";

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

                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster />
              </BrowserRouter>
            </OperatorAuthProvider>
          </AuthProvider>
        </TooltipProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}
