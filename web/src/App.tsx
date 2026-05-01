import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

import { TenantProvider } from "@/providers/TenantProvider";
import AuthProvider from "@/components/auth/AuthProvider";
import OperatorAuthProvider from "@/components/auth/OperatorAuthProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";

// Showroom layout
import { ShowroomLayout } from "@/components/showroom/ShowroomLayout";

// Showroom pages
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Lookbook from "@/pages/Lookbook";

// Auth / member pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

// Admin pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ProductList from "@/pages/admin/products/ProductList";
import ProductForm from "@/pages/admin/products/ProductForm";
import CollectionList from "@/pages/admin/collections/CollectionList";
import CollectionForm from "@/pages/admin/collections/CollectionForm";
import OrderList from "@/pages/admin/orders/OrderList";
import OrderDetail from "@/pages/admin/orders/OrderDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <TooltipProvider>
          <AuthProvider>
            <OperatorAuthProvider>
              <BrowserRouter>
                <Routes>
                  {/* ── Showroom (TopBar + Footer) ── */}
                  <Route element={<ShowroomLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/lookbook" element={<Lookbook />} />
                  </Route>

                  {/* ── Member auth ── */}
                  <Route path="/login" element={<Login />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                  </Route>

                  {/* ── Admin ── */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route element={<AdminRoute />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />

                    {/* Products */}
                    <Route path="/admin/products" element={<ProductList />} />
                    <Route path="/admin/products/new" element={<ProductForm />} />
                    <Route path="/admin/products/:id/edit" element={<ProductForm />} />

                    {/* Collections */}
                    <Route path="/admin/collections" element={<CollectionList />} />
                    <Route path="/admin/collections/new" element={<CollectionForm />} />
                    <Route path="/admin/collections/:id/edit" element={<CollectionForm />} />

                    {/* Orders */}
                    <Route path="/admin/orders" element={<OrderList />} />
                    <Route path="/admin/orders/:id" element={<OrderDetail />} />
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
