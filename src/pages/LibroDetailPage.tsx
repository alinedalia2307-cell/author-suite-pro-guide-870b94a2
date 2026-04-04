import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, SpellCheck, Palette, BookImage, Globe, Loader2 } from "lucide-react";
import { useBook, getStatusLabel } from "@/hooks/useBooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import ManuscriptEditor from "@/components/manuscript/ManuscriptEditor";
import CorrectionPanel from "@/components/correction/CorrectionPanel";
import LayoutPanel from "@/components/layout/LayoutPanel";
import CoverPanel from "@/components/cover/CoverPanel";
import PublicationPanel from "@/components/publication/PublicationPanel";

const phases = [
  { value: "manuscrito", label: "Manuscrito", icon: Upload, description: "Sube tu manuscrito en Word, PDF o texto plano para comenzar el proceso." },
  { value: "correccion", label: "Corrección", icon: SpellCheck, description: "Revisa y corrige la gramática, ortografía y estilo con ayuda de IA." },
  { value: "maquetacion", label: "Maquetación", icon: Palette, description: "Da formato profesional a tu libro." },
  { value: "portada", label: "Portada", icon: BookImage, description: "Diseña una portada atractiva y profesional para tu libro." },
  { value: "publicacion", label: "Publicación", icon: Globe, description: "Publica en Amazon, Apple Books, Google Play y más plataformas." },
];

export default function LibroDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: book, isLoading } = useBook(id);

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!book) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Libro no encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/mis-libros")}>Volver a Mis Libros</Button>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-primary px-8 py-8">
        <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground mb-4 -ml-2 gap-1" onClick={() => navigate("/mis-libros")}>
          <ArrowLeft className="w-4 h-4" /> Mis Libros
        </Button>
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground truncate">{book.title}</h1>
            {book.subtitle && <p className="text-primary-foreground/60 mt-1 truncate">{book.subtitle}</p>}
            <p className="text-primary-foreground/50 text-sm mt-2">
              {book.author || "Sin autor"} · {new Date(book.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Badge variant="secondary" className="mt-1 shrink-0">{getStatusLabel(book.status)}</Badge>
        </div>
      </div>

      {/* Phases */}
      <div className="p-8">
        <Tabs defaultValue="manuscrito" className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 mb-6">
            {phases.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="gap-2 data-[state=active]:bg-card">
                <p.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{p.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Manuscrito – real editor */}
          <TabsContent value="manuscrito" className="mt-0">
            <div className="rounded-lg border border-border overflow-hidden">
              <ManuscriptEditor bookId={book.id} />
            </div>
          </TabsContent>

          {/* Corrección – review panel */}
          <TabsContent value="correccion" className="mt-0">
            <div className="rounded-lg border border-border overflow-hidden">
              <CorrectionPanel bookId={book.id} />
            </div>
          </TabsContent>

          {/* Maquetación */}
          <TabsContent value="maquetacion" className="mt-0">
            <div className="rounded-lg border border-border overflow-hidden">
              <LayoutPanel bookId={book.id} />
            </div>
          </TabsContent>

          {/* Portada */}
          <TabsContent value="portada" className="mt-0">
            <div className="rounded-lg border border-border overflow-hidden">
              <CoverPanel bookId={book.id} bookTitle={book.title} bookSubtitle={book.subtitle} bookAuthor={book.author} />
            </div>
          </TabsContent>

          {/* Publicación */}
          <TabsContent value="publicacion" className="mt-0">
            <div className="rounded-lg border border-border overflow-hidden">
              <PublicationPanel bookId={book.id} bookTitle={book.title} bookSubtitle={book.subtitle} bookAuthor={book.author} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
