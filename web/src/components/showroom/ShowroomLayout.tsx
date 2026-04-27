import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";

export function ShowroomLayout() {
  return (
    <div style={{ background: "var(--brand-background)", minHeight: "100vh" }}>
      <TopBar/>
      <Outlet/>
      <Footer/>
      <CartDrawer/>
    </div>
  );
}
