import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, PenLine, Save, Loader2, CheckCircle2,
  Plus, ChevronUp, ChevronDown, Trash2, Pencil, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const activeChapter = chapters.find((c) => c.id === activeId);

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
        if (activeId) {
          updateContent(text);
        } else {
          addChapter.mutate(undefined, {
            onSuccess: () => setTimeout(() => updateContent(text), 300),
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Empty state ──
  if (chapters.length === 0) {
    return (
      <div
        className="grid gap-6 sm:grid-cols-3 min-h-[350px] py-8"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input ref={fileInputRef} type="file" accept=".docx,.txt" className="hidden" onChange={onFileChange} />
        {[
          { icon: Upload, label: "Subir archivo", sub: ".docx o .txt", action: () => fileInputRef.current?.click() },
          { icon: FileText, label: "Pegar texto", sub: "Crea un capítulo y pega", action: () => addChapter.mutate() },
          { icon: PenLine, label: "Escribir desde cero", sub: "Capítulo en blanco", action: () => addChapter.mutate() },
        ].map((item) => (
          <Card
            key={item.label}
            className="flex flex-col items-center justify-center gap-3 p-10 cursor-pointer border-dashed border-2 border-border hover:border-accent/50 hover:bg-secondary/40 transition-all duration-200"
            onClick={item.action}
          >
            {importing && item.icon === Upload ? (
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
            ) : (
              <item.icon className="w-10 h-10 text-muted-foreground" />
            )}
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.sub}</span>
          </Card>
        ))}
      </div>
    );
  }

  // ── Editor layout ──
  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[500px]">
      {/* Chapter sidebar */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-border bg-secondary/20">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capítulos</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => addChapter.mutate()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col py-1">
            {chapters.map((ch, idx) => (
              <div
                key={ch.id}
                className={`group flex items-center gap-1 mx-1 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                  ch.id === activeId
                    ? "bg-card text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
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
                    <button onClick={(e) => { e.stopPropagation(); commitRename(); }} className="text-accent">
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

        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {chapters.length} {chapters.length === 1 ? "capítulo" : "capítulos"}
        </div>
      </aside>

      {/* Writing area */}
      <div className="flex-1 flex flex-col min-w-0 bg-card">
        {/* Minimal toolbar */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-sm font-semibold text-foreground truncate max-w-[300px]">
              {activeChapter?.title ?? "Sin título"}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Importar
            </Button>
            <input ref={fileInputRef} type="file" accept=".docx,.txt" className="hidden" onChange={onFileChange} />
            <div className="h-4 w-px bg-border" />
            {isSaving ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Guardando…
              </span>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-accent" /> Guardado
              </span>
            )}
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={saveNow}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> Guardar
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div
          className="flex-1 overflow-y-auto"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <div className="max-w-2xl mx-auto px-8 py-10">
            <textarea
              value={content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="Empieza a escribir…"
              className="w-full min-h-[60vh] resize-none border-0 bg-transparent font-body text-base leading-[1.9] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
              spellCheck
            />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-6 py-1.5 border-t border-border bg-secondary/30 text-xs text-muted-foreground">
          <span>{wordCount.toLocaleString("es-ES")} palabras · {charCount.toLocaleString("es-ES")} caracteres</span>
          <span className="text-muted-foreground/60">Autoguardado activo</span>
        </div>
      </div>
    </div>
  );
}
