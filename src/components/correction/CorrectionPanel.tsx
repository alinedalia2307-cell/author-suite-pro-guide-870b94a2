import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Sparkles, PanelRightOpen, PanelRightClose, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChapters } from "@/hooks/useChapters";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Types ──

type CorrectionType = "ortografia" | "gramatica" | "tipografia" | "claridad";

interface Correction {
  id: string;
  type: CorrectionType;
  original: string;
  suggestion: string;
  explanation: string;
  status: "pending" | "accepted" | "rejected";
}

const TYPE_META: Record<CorrectionType, { label: string; color: string }> = {
  ortografia: { label: "Ortografía", color: "bg-destructive/10 text-destructive border-destructive/20" },
  gramatica: { label: "Gramática", color: "bg-accent/15 text-accent-foreground border-accent/30" },
  tipografia: { label: "Tipografía", color: "bg-primary/10 text-primary border-primary/20" },
  claridad: { label: "Claridad", color: "bg-secondary text-secondary-foreground border-border" },
};

function mapCorrectionType(aiType: string): CorrectionType {
  const map: Record<string, CorrectionType> = {
    "ortografía": "ortografia",
    "gramática": "gramatica",
    "estilo": "claridad",
    "puntuación": "tipografia",
  };
  return map[aiType] || "claridad";
}

// ── Component ──

interface Props {
  bookId: string;
}

export default function CorrectionPanel({ bookId }: Props) {
  const { chapters, activeId, content, isLoading, selectChapter, updateContent } = useChapters(bookId);
  const [corrections, setCorrections] = useState<Record<string, Correction[]>>({});
  const [filterType, setFilterType] = useState<CorrectionType | "all">("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [panelOpen, setPanelOpen] = useState(true);
  const { toast } = useToast();

  const activeChapter = chapters.find((c) => c.id === activeId);
  const chapterCorrections = corrections[activeId ?? ""] ?? [];

  const filteredCorrections = filterType === "all"
    ? chapterCorrections
    : chapterCorrections.filter((c) => c.type === filterType);

  const pendingCount = chapterCorrections.filter((c) => c.status === "pending").length;
  const acceptedCount = chapterCorrections.filter((c) => c.status === "accepted").length;
  const rejectedCount = chapterCorrections.filter((c) => c.status === "rejected").length;

  // ── AI Analysis ──
  const analyzeChapter = async () => {
    if (!activeId || !content.trim()) {
      toast({ title: "Sin texto", description: "Escribe algo en el capítulo antes de analizar.", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("correct-manuscript", {
        body: { text: content, lang: "es" },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      const aiCorrections: Correction[] = (data.corrections || []).map(
        (c: any, i: number) => ({
          id: `${activeId}-ai-${i}`,
          type: mapCorrectionType(c.type),
          original: c.original,
          suggestion: c.suggestion,
          explanation: c.explanation || "",
          status: "pending" as const,
        })
      );

      setCorrections((prev) => ({ ...prev, [activeId]: aiCorrections }));
      setSummaries((prev) => ({ ...prev, [activeId]: data.summary || "" }));
      setPanelOpen(true);

      if (aiCorrections.length === 0) {
        toast({ title: "¡Sin errores!", description: "No se detectaron correcciones en este capítulo." });
      } else {
        toast({ title: `${aiCorrections.length} sugerencias encontradas` });
      }
    } catch (err: any) {
      console.error("AI correction error:", err);
      toast({
        title: "Error de análisis",
        description: err?.message || "No se pudo conectar con el servicio de IA.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAccept = (id: string) => {
    if (!activeId) return;
    const corr = chapterCorrections.find((c) => c.id === id);
    if (!corr) return;

    const currentContent = content;
    if (currentContent.includes(corr.original)) {
      const updated = currentContent.replace(corr.original, corr.suggestion);
      updateContent(updated);
    }

    setCorrections((prev) => ({
      ...prev,
      [activeId]: (prev[activeId] ?? []).map((c) =>
        c.id === id ? { ...c, status: "accepted" as const } : c
      ),
    }));
    toast({ title: "Corrección aplicada" });
  };

  const handleReject = (id: string) => {
    if (!activeId) return;
    setCorrections((prev) => ({
      ...prev,
      [activeId]: (prev[activeId] ?? []).map((c) =>
        c.id === id ? { ...c, status: "rejected" as const } : c
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center gap-3">
        <p className="text-muted-foreground">No hay capítulos para corregir.</p>
        <p className="text-xs text-muted-foreground">Añade capítulos en la pestaña «Manuscrito» primero.</p>
      </div>
    );
  }

  const summary = summaries[activeId ?? ""] ?? "";

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {/* Chapter selector dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-sm font-medium max-w-[280px]">
                <span className="truncate">{activeChapter?.title ?? "Seleccionar sección"}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {chapters.map((ch) => {
                const chCorr = corrections[ch.id] ?? [];
                const chPending = chCorr.filter((c) => c.status === "pending").length;
                return (
                  <DropdownMenuItem
                    key={ch.id}
                    onClick={() => selectChapter(ch.id)}
                    className={ch.id === activeId ? "bg-accent/10 font-medium" : ""}
                  >
                    <span className="truncate flex-1">{ch.title}</span>
                    {chPending > 0 && (
                      <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 h-5 bg-destructive/10 text-destructive border-destructive/20">
                        {chPending}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Stats */}
          {chapterCorrections.length > 0 && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{pendingCount} pendientes</span>
              <span className="text-accent">✓ {acceptedCount}</span>
              <span className="text-destructive/60">✗ {rejectedCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="shrink-0 gap-1.5 text-xs"
            onClick={analyzeChapter}
            disabled={analyzing || !content.trim()}
          >
            {analyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {analyzing ? "Analizando…" : "Analizar texto"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground"
            onClick={() => setPanelOpen(!panelOpen)}
            title={panelOpen ? "Ocultar sugerencias" : "Mostrar sugerencias"}
          >
            {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Text content — takes full width when panel closed */}
        <div className="flex-1 min-w-0 bg-card">
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto px-10 py-10">
              <p className="font-body text-[15px] leading-[2] text-foreground whitespace-pre-wrap tracking-[0.01em]">
                {content || <span className="text-muted-foreground/40 italic">Capítulo vacío</span>}
              </p>
            </div>
          </ScrollArea>
        </div>

        {/* Collapsible suggestions panel */}
        {panelOpen && (
          <aside className="w-80 shrink-0 flex flex-col border-l border-border bg-secondary/10">
            {/* Filter chips */}
            {chapterCorrections.length > 0 && (
              <div className="px-3 py-2.5 border-b border-border">
                <div className="flex flex-wrap gap-1">
                  {(["all", "ortografia", "gramatica", "tipografia", "claridad"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        filterType === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/30"
                      }`}
                    >
                      {t === "all" ? "Todas" : TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="mx-3 mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                <p className="text-[11px] font-medium text-foreground mb-0.5">Resumen</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{summary}</p>
              </div>
            )}

            {/* Corrections list */}
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-2 p-3">
                {chapterCorrections.length === 0 && !analyzing && (
                  <div className="flex flex-col items-center gap-3 py-10 text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pulsa «Analizar texto» para recibir sugerencias de corrección con IA.
                    </p>
                  </div>
                )}
                {analyzing && (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Analizando capítulo…</p>
                  </div>
                )}
                {filteredCorrections.map((corr) => (
                  <div
                    key={corr.id}
                    className={`rounded-lg border p-3 space-y-2 transition-opacity ${
                      corr.status !== "pending" ? "opacity-50" : ""
                    } ${
                      corr.status === "accepted"
                        ? "border-accent/30 bg-accent/5"
                        : corr.status === "rejected"
                          ? "border-border bg-muted/30"
                          : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-[10px] ${TYPE_META[corr.type].color}`}>
                        {TYPE_META[corr.type].label}
                      </Badge>
                      {corr.status !== "pending" && (
                        <span className="text-[10px] text-muted-foreground">
                          {corr.status === "accepted" ? "Aceptada" : "Rechazada"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-destructive font-medium mt-0.5 shrink-0">Original:</span>
                        <span className="text-xs text-foreground line-through decoration-destructive/40">{corr.original}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-accent font-medium mt-0.5 shrink-0">Sugerido:</span>
                        <span className="text-xs text-foreground font-medium">{corr.suggestion}</span>
                      </div>
                    </div>

                    {corr.explanation && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">{corr.explanation}</p>
                    )}

                    {corr.status === "pending" && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs flex-1 text-accent hover:text-accent hover:bg-accent/10"
                          onClick={() => handleAccept(corr.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aceptar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs flex-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(corr.id)}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  );
}
