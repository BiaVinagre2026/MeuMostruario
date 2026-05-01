import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";

export function ShowroomLayout() {
  const { pathname } = useLocation();
  const isProductPage = pathname.startsWith("/product/");

  return (
    <div style={{ background: "var(--brand-background)", minHeight: "100vh" }}>
      <TopBar/>
      <Outlet/>
      <Footer compact={isProductPage}/>
      <CartDrawer/>
    </div>
  );
}
