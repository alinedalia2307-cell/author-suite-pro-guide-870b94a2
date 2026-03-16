import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, PenLine, Save, Loader2, CheckCircle2,
  Plus, ChevronUp, ChevronDown, Trash2, Pencil, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChapters } from "@/hooks/useChapters";
import { useToast } from "@/hooks/use-toast";
import mammoth from "mammoth";

interface Props {
  bookId: string;
}

export default function ManuscriptEditor({ bookId }: Props) {
  const {
    chapters,
    activeId,
    content,
    isLoading,
    isSaving,
    wordCount,
    charCount,
    selectChapter,
    updateContent,
    saveNow,
    addChapter,
    renameChapter,
    deleteChapter,
    moveChapter,
  } = useChapters(bookId);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // ── File import ──
  const handleFile = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        let text = "";

        if (ext === "txt") {
          text = await file.text();
        } else if (ext === "docx") {
          const buffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: buffer });
          text = result.value;
        } else {
          toast({ title: "Formato no soportado", description: "Solo .docx o .txt", variant: "destructive" });
          setImporting(false);
          return;
        }

        // Import as content of current chapter, or create one
        if (activeId) {
          updateContent(text);
        } else {
          addChapter.mutate(undefined, {
            onSuccess: () => {
              // Will be set as active automatically, then update content
              setTimeout(() => updateContent(text), 300);
            },
          });
        }
        toast({ title: "Archivo importado", description: file.name });
      } catch {
        toast({ title: "Error al importar", description: "No se pudo leer el archivo.", variant: "destructive" });
      } finally {
        setImporting(false);
      }
    },
    [activeId, updateContent, addChapter, toast]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const commitRename = () => {
    if (editingId && editingTitle.trim()) {
      renameChapter.mutate({ id: editingId, title: editingTitle.trim() });
    }
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── No chapters yet ──
  if (chapters.length === 0) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-3 min-h-[300px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input ref={fileInputRef} type="file" accept=".docx,.txt" className="hidden" onChange={onFileChange} />

        <Card
          className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-muted/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" /> : <Upload className="w-10 h-10 text-muted-foreground" />}
          <span className="font-medium text-foreground">Subir archivo</span>
          <span className="text-xs text-muted-foreground">.docx o .txt</span>
        </Card>

        <Card
          className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-muted/40 transition-colors"
          onClick={() => addChapter.mutate()}
        >
          <FileText className="w-10 h-10 text-muted-foreground" />
          <span className="font-medium text-foreground">Pegar texto</span>
          <span className="text-xs text-muted-foreground">Crea un capítulo y pega</span>
        </Card>

        <Card
          className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-muted/40 transition-colors"
          onClick={() => addChapter.mutate()}
        >
          <PenLine className="w-10 h-10 text-muted-foreground" />
          <span className="font-medium text-foreground">Escribir desde cero</span>
          <span className="text-xs text-muted-foreground">Capítulo en blanco</span>
        </Card>
      </div>
    );
  }

  // ── Editor with chapter sidebar ──
  return (
    <div className="flex gap-4 h-full min-h-[500px]">
      {/* Chapter sidebar */}
      <div className="w-56 shrink-0 flex flex-col border-r border-border pr-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Capítulos</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => addChapter.mutate()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 -mr-2 pr-2">
          <div className="flex flex-col gap-1">
            {chapters.map((ch, idx) => (
              <div
                key={ch.id}
                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                  ch.id === activeId
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                onClick={() => selectChapter(ch.id)}
              >
                {editingId === ch.id ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="h-6 text-xs px-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={(e) => { e.stopPropagation(); commitRename(); }} className="text-primary">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="text-muted-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="truncate flex-1 min-w-0">{ch.title}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      {idx > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); moveChapter.mutate({ id: ch.id, direction: "up" }); }}>
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                      {idx < chapters.length - 1 && (
                        <button onClick={(e) => { e.stopPropagation(); moveChapter.mutate({ id: ch.id, direction: "down" }); }}>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); startRename(ch.id, ch.title); }}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                      {chapters.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); deleteChapter.mutate(ch.id); }}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="pt-3 mt-2 border-t border-border text-xs text-muted-foreground">
          {chapters.length} {chapters.length === 1 ? "capítulo" : "capítulos"}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload className="w-4 h-4 mr-1" /> Importar
            </Button>
            <input ref={fileInputRef} type="file" accept=".docx,.txt" className="hidden" onChange={onFileChange} />
          </div>

          <div className="flex items-center gap-3">
            {isSaving ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Guardando…
              </span>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Guardado
              </span>
            )}
            <Button size="sm" onClick={saveNow}>
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </div>
        </div>

        {/* Text area */}
        <Textarea
          value={content}
          onChange={(e) => updateContent(e.target.value)}
          placeholder="Empieza a escribir aquí…"
          className="flex-1 min-h-[400px] resize-none font-serif text-base leading-relaxed p-6 bg-card border-border focus-visible:ring-primary/30"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        />

        {/* Status bar */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
          <span>{wordCount.toLocaleString("es-ES")} palabras</span>
          <span>{charCount.toLocaleString("es-ES")} caracteres</span>
        </div>
      </div>
    </div>
  );
}
