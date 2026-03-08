import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";

const Index = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <Dashboard />
    </div>
  );
};

export default Index;
