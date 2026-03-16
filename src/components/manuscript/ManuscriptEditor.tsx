import { useState, useRef, useCallback } from "react";
import { Upload, FileText, PenLine, Save, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useManuscriptDb } from "@/hooks/useManuscriptDb";
import { useToast } from "@/hooks/use-toast";
import mammoth from "mammoth";

type Mode = "choose" | "editor";

interface Props {
  bookId: string;
}

export default function ManuscriptEditor({ bookId }: Props) {
  const {
    content,
    isLoading,
    isSaving,
    wordCount,
    charCount,
    updateContent,
    saveNow,
    importContent,
    exists,
  } = useManuscriptDb(bookId);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>(exists ? "editor" : "choose");
  const [importing, setImporting] = useState(false);

  // Switch to editor once manuscript exists
  if (exists && mode === "choose") {
    setMode("editor");
  }

  const handleFile = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();

        if (ext === "txt") {
          const text = await file.text();
          importContent(text, "upload", file.name);
          setMode("editor");
          toast({ title: "Archivo importado", description: file.name });
        } else if (ext === "docx") {
          const buffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: buffer });
          importContent(result.value, "upload", file.name);
          setMode("editor");
          toast({ title: "Archivo importado", description: file.name });
        } else {
          toast({ title: "Formato no soportado", description: "Solo se aceptan archivos .docx o .txt", variant: "destructive" });
        }
      } catch {
        toast({ title: "Error al importar", description: "No se pudo leer el archivo.", variant: "destructive" });
      } finally {
        setImporting(false);
      }
    },
    [importContent, toast]
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Choose mode ──
  if (mode === "choose") {
    return (
      <div
        className="grid gap-4 sm:grid-cols-3 min-h-[300px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.txt"
          className="hidden"
          onChange={onFileChange}
        />

        <Card
          className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-muted/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? (
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">Subir archivo</span>
          <span className="text-xs text-muted-foreground">.docx o .txt</span>
        </Card>

        <Card
          className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-muted/40 transition-colors"
          onClick={() => {
            importContent("", "paste");
            setMode("editor");
          }}
        >
          <FileText className="w-10 h-10 text-muted-foreground" />
          <span className="font-medium text-foreground">Pegar texto</span>
          <span className="text-xs text-muted-foreground">Copia y pega tu manuscrito</span>
        </Card>

        <Card
          className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-muted/40 transition-colors"
          onClick={() => {
            importContent("", "manual");
            setMode("editor");
          }}
        >
          <PenLine className="w-10 h-10 text-muted-foreground" />
          <span className="font-medium text-foreground">Escribir desde cero</span>
          <span className="text-xs text-muted-foreground">Manuscrito en blanco</span>
        </Card>
      </div>
    );
  }

  // ── Editor mode ──
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-4 h-4 mr-1" />
            Importar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.txt"
            className="hidden"
            onChange={onFileChange}
          />
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
        placeholder="Empieza a escribir tu manuscrito aquí…"
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
  );
}
