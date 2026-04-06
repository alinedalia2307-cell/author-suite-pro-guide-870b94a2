import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

const TYPE_META: Record<CorrectionType, { label: string; color: string; highlightBg: string; highlightBorder: string }> = {
  ortografia: {
    label: "Ortografía",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    highlightBg: "bg-red-500/15",
    highlightBorder: "border-b-2 border-red-400",
  },
  gramatica: {
    label: "Gramática",
    color: "bg-accent/15 text-accent-foreground border-accent/30",
    highlightBg: "bg-amber-500/15",
    highlightBorder: "border-b-2 border-amber-400",
  },
  tipografia: {
    label: "Tipografía",
    color: "bg-primary/10 text-primary border-primary/20",
    highlightBg: "bg-purple-500/15",
    highlightBorder: "border-b-2 border-purple-400",
  },
  claridad: {
    label: "Claridad",
    color: "bg-secondary text-secondary-foreground border-border",
    highlightBg: "bg-blue-500/10",
    highlightBorder: "border-b-2 border-blue-400",
  },
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

// ── Highlighted Text Renderer ──

interface HighlightedTextProps {
  text: string;
  corrections: Correction[];
  focusedId: string | null;
  onClickHighlight: (id: string) => void;
  onApply: (id: string) => void;
}

function HighlightedText({ text, corrections, focusedId, onClickHighlight, onApply }: HighlightedTextProps) {
  const pendingCorrections = corrections.filter((c) => c.status === "pending");

  // Build segments: find all occurrences and split text
  const segments = useMemo(() => {
    if (pendingCorrections.length === 0) return [{ text, correction: null }];

    // Find positions of each correction in the text
    type Segment = { text: string; correction: Correction | null };
    const matches: { start: number; end: number; correction: Correction }[] = [];

    for (const corr of pendingCorrections) {
      const idx = text.indexOf(corr.original);
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + corr.original.length, correction: corr });
      }
    }

    // Sort by position, remove overlaps
    matches.sort((a, b) => a.start - b.start);
    const filtered: typeof matches = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        filtered.push(m);
        lastEnd = m.end;
      }
    }

    if (filtered.length === 0) return [{ text, correction: null }];

    const result: Segment[] = [];
    let pos = 0;
    for (const m of filtered) {
      if (m.start > pos) {
        result.push({ text: text.slice(pos, m.start), correction: null });
      }
      result.push({ text: text.slice(m.start, m.end), correction: m.correction });
      pos = m.end;
    }
    if (pos < text.length) {
      result.push({ text: text.slice(pos), correction: null });
    }
    return result;
  }, [text, pendingCorrections]);

  return (
    <TooltipProvider delayDuration={200}>
      <p className="font-body text-[15px] leading-[2] text-foreground whitespace-pre-wrap tracking-[0.01em]">
        {segments.map((seg, i) => {
          if (!seg.correction) {
            return <span key={i}>{seg.text}</span>;
          }
          const meta = TYPE_META[seg.correction.type];
          const isFocused = seg.correction.id === focusedId;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span
                  id={`hl-${seg.correction.id}`}
                  className={`cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-all ${meta.highlightBg} ${meta.highlightBorder} ${
                    isFocused ? "ring-2 ring-primary/40 shadow-sm" : ""
                  }`}
                  onClick={() => onClickHighlight(seg.correction!.id)}
                >
                  {seg.text}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                    {meta.label}
                  </Badge>
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="line-through text-muted-foreground">{seg.correction.original}</div>
                  <div className="font-medium text-foreground">{seg.correction.suggestion}</div>
                </div>
                {seg.correction.explanation && (
                  <p className="text-[11px] text-muted-foreground italic">{seg.correction.explanation}</p>
                )}
                <Button
                  size="sm"
                  className="w-full h-7 text-xs mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply(seg.correction!.id);
                  }}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Aplicar corrección
                </Button>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </p>
    </TooltipProvider>
  );
}

// ── Main Component ──

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
  const [focusedId, setFocusedId] = useState<string | null>(null);
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
    setFocusedId(null);
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
    setFocusedId(null);
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
    if (focusedId === id) setFocusedId(null);
  };

  const handleClickHighlight = useCallback((id: string) => {
    setFocusedId(id);
    setPanelOpen(true);
    // Scroll suggestion into view
    setTimeout(() => {
      document.getElementById(`corr-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, []);

  const handleClickSuggestion = useCallback((id: string) => {
    setFocusedId(id);
    // Scroll highlight into view
    setTimeout(() => {
      document.getElementById(`hl-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, []);

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
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
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
        {/* Text content with inline highlights */}
        <div className="flex-1 min-w-0 bg-card">
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto px-10 py-10">
              {content ? (
                <HighlightedText
                  text={content}
                  corrections={chapterCorrections}
                  focusedId={focusedId}
                  onClickHighlight={handleClickHighlight}
                  onApply={handleAccept}
                />
              ) : (
                <p className="font-body text-[15px] leading-[2] text-muted-foreground/40 italic">Capítulo vacío</p>
              )}
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
                {filteredCorrections.map((corr) => {
                  const meta = TYPE_META[corr.type];
                  const isFocused = corr.id === focusedId;
                  return (
                    <div
                      key={corr.id}
                      id={`corr-${corr.id}`}
                      onClick={() => corr.status === "pending" && handleClickSuggestion(corr.id)}
                      className={`rounded-lg border p-3 space-y-2 transition-all cursor-pointer ${
                        corr.status !== "pending" ? "opacity-50 cursor-default" : ""
                      } ${
                        isFocused && corr.status === "pending"
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                          : corr.status === "accepted"
                            ? "border-accent/30 bg-accent/5"
                            : corr.status === "rejected"
                              ? "border-border bg-muted/30"
                              : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                          {meta.label}
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
                            onClick={(e) => { e.stopPropagation(); handleAccept(corr.id); }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aceptar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs flex-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); handleReject(corr.id); }}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  );
}
