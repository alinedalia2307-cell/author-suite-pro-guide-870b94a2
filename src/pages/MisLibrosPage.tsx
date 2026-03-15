import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Plus, Trash2, ChevronRight, Loader2 } from "lucide-react";
import { useBooks, getStatusLabel, type CreateBookInput } from "@/hooks/useBooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  uploading: "outline",
  correcting: "outline",
  formatting: "outline",
  publishing: "outline",
  published: "default",
};

export default function MisLibrosPage() {
  const navigate = useNavigate();
  const { books, isLoading, createBook, deleteBook } = useBooks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [form, setForm] = useState<CreateBookInput>({ title: "", subtitle: "", author: "", language: "es" });

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createBook.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ title: "", subtitle: "", author: "", language: "es" });
      },
    });
  };

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-primary px-8 py-8">
        <div className="flex items-center justify-between max-w-5xl">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">Mis Libros</h1>
            <p className="text-primary-foreground/70 mt-1">Gestiona tus proyectos de libro en un solo lugar.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                <Plus className="w-4 h-4" /> Nuevo libro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Crear nuevo libro</DialogTitle>
                <DialogDescription>Introduce los datos básicos de tu proyecto.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input id="title" placeholder="El título de tu libro" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtítulo</Label>
                  <Input id="subtitle" placeholder="Subtítulo (opcional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Autor</Label>
                  <Input id="author" placeholder="Nombre del autor" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">Inglés</SelectItem>
                      <SelectItem value="fr">Francés</SelectItem>
                      <SelectItem value="pt">Portugués</SelectItem>
                      <SelectItem value="de">Alemán</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!form.title.trim() || createBook.isPending} className="gap-2">
                  {createBook.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear libro
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-5xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground/40 mb-4" />
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">Aún no tienes libros</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">Crea tu primer proyecto de libro para comenzar el proceso de publicación.</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              <Plus className="w-4 h-4" /> Crear mi primer libro
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {books.map((book) => (
              <Card
                key={book.id}
                className="flex items-center gap-4 p-5 cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
                onClick={() => navigate(`/libro/${book.id}`)}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <BookOpen className="w-6 h-6 text-muted-foreground group-hover:text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-semibold text-card-foreground truncate">{book.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {book.author || "Sin autor"} · {new Date(book.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[book.status] ?? "secondary"}>{getStatusLabel(book.status)}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(book.id); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0" />
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este libro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán todos los datos del proyecto.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) deleteBook.mutate(deleteTarget); setDeleteTarget(null); }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
