import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import Dashboard from "./pages/Dashboard";
import EditorPage from "./pages/EditorPage";
import OrganizarPage from "./pages/OrganizarPage";
import MaquetarPage from "./pages/MaquetarPage";
import PortadaPage from "./pages/PortadaPage";
import TraducirPage from "./pages/TraducirPage";
import PublicarPage from "./pages/PublicarPage";
import AjustesPage from "./pages/AjustesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/organizar" element={<OrganizarPage />} />
            <Route path="/maquetar" element={<MaquetarPage />} />
            <Route path="/portada" element={<PortadaPage />} />
            <Route path="/traducir" element={<TraducirPage />} />
            <Route path="/publicar" element={<PublicarPage />} />
            <Route path="/ajustes" element={<AjustesPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
