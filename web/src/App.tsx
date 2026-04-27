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
                    <Route path="/lookbook" element={<Lookbook />} />
                    {/* catalog & product require login */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/catalog" element={<Catalog />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                    </Route>
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
