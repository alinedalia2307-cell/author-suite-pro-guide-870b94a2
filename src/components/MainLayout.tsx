import AppSidebar from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <Outlet />
    </div>
  );
}
