import { useState, useCallback } from "react";
import { useManuscript } from "@/hooks/useManuscript";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AiCorrectionPanel from "@/components/editor/AiCorrectionPanel";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PenTool,
  Plus,
  Trash2,
  Sparkles,
  Save,
  FileText,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EditorPage() {
  const {
    chapters,
    activeChapter,
    activeId,
    setActiveId,
    updateContent,
    addChapter,
    renameChapter,
    deleteChapter,
    wordCount,
    charCount,
  } = useManuscript();

  const { toast } = useToast();
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [spellLang, setSpellLang] = useState("es");

  const spellLangs = [
    { code: "es", label: "Español" },
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
    { code: "pt", label: "Português" },
    { code: "de", label: "Deutsch" },
  ];

  const handleSave = () => {
    toast({ title: "Guardado", description: "El capítulo se ha guardado correctamente." });
  };

  const handleApplyCorrection = useCallback(
    (original: string, suggestion: string) => {
      if (!activeChapter) return;
      const newContent = activeChapter.content.replace(original, suggestion);
      if (newContent !== activeChapter.content) {
        updateContent(newContent);
      }
    },
    [activeChapter, updateContent]
  );

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const commitRename = () => {
    if (editingId && editingTitle.trim()) {
      renameChapter(editingId, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <main className="flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/15 text-gold flex items-center justify-center">
            <PenTool className="w-4 h-4" />
          </div>
          <h1 className="font-display text-lg font-bold text-foreground">
            {activeChapter?.title ?? "Editor"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gold-outline" size="sm" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="w-4 h-4 mr-1" />
            Corregir con IA
          </Button>
          <Button variant="gold" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />
            Guardar
          </Button>
        </div>
      </header>

      {/* Editor body */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Chapter sidebar */}
        <ResizablePanel defaultSize={22} minSize={16} maxSize={35}>
          <div className="h-full flex flex-col bg-card/30">
            <div className="flex items-center justify-between px-3 py-3 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Capítulos
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addChapter}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {chapters.map((ch) => (
                  <div
                    key={ch.id}
                    className={`group flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                      ch.id === activeId
                        ? "bg-gold/15 text-gold"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                    onClick={() => setActiveId(ch.id)}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingId === ch.id ? (
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-6 text-xs px-1 py-0"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span
                            className="text-sm truncate block"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              startRename(ch.id, ch.title);
                            }}
                          >
                            {ch.title}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                            <span>{ch.content.trim().split(/\s+/).filter(Boolean).length} pal.</span>
                            <span>·</span>
                            <span>{new Date(ch.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                          </div>
                        </>
                      )}
                    </div>
                    {chapters.length > 1 && (
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(ch.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Editor area */}
        <ResizablePanel defaultSize={78}>
          <div className="h-full flex flex-col">
            <Textarea
              value={activeChapter?.content ?? ""}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="Comienza a escribir tu manuscrito aquí…"
              spellCheck={true}
              lang={spellLang}
              className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 p-6 text-base leading-relaxed font-body bg-background"
              style={{ fontFamily: "'Source Sans 3', sans-serif" }}
            />
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-card/50 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>{wordCount.toLocaleString()} palabras</span>
                <span>{charCount.toLocaleString()} caracteres</span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={spellLang}
                  onChange={(e) => setSpellLang(e.target.value)}
                  className="bg-transparent border border-border rounded px-1.5 py-0.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {spellLangs.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-gold" />
                  <span>Autoguardado</span>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* AI Correction Panel */}
      <AiCorrectionPanel
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        text={activeChapter?.content ?? ""}
        lang={spellLang}
        onApplyCorrection={handleApplyCorrection}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar capítulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El contenido del capítulo se perderá permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteChapter(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
