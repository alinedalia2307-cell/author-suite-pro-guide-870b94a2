import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import Dashboard from "./pages/Dashboard";
import MisLibrosPage from "./pages/MisLibrosPage";
import LibroDetailPage from "./pages/LibroDetailPage";
import SubirManuscritoPage from "./pages/SubirManuscritoPage";
import CorreccionPage from "./pages/CorreccionPage";
import MaquetacionPage from "./pages/MaquetacionPage";
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
            <Route path="/mis-libros" element={<MisLibrosPage />} />
            <Route path="/libro/:id" element={<LibroDetailPage />} />
            <Route path="/subir-manuscrito" element={<SubirManuscritoPage />} />
            <Route path="/correccion" element={<CorreccionPage />} />
            <Route path="/maquetacion" element={<MaquetacionPage />} />
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
