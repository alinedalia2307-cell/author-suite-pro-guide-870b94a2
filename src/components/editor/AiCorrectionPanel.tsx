import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ArrowRight, ChevronUp, ChevronDown, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Correction {
  original: string;
  suggestion: string;
  type: "ortografía" | "gramática" | "estilo" | "puntuación";
  explanation: string;
}

interface AiCorrectionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  lang: string;
  onApplyCorrection: (original: string, suggestion: string) => void;
  onApplyAll?: (corrections: { original: string; suggestion: string }[]) => void;
}

const typeBadgeColor: Record<string, string> = {
  ortografía: "bg-red-500/15 text-red-400 border-red-500/30",
  gramática: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  estilo: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  puntuación: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export default function AiCorrectionPanel({
  open,
  onOpenChange,
  text,
  lang,
  onApplyCorrection,
  onApplyAll,
}: AiCorrectionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [summary, setSummary] = useState("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { toast } = useToast();

  const pendingIndices = corrections
    .map((_, i) => i)
    .filter((i) => !applied.has(i));

  const analyze = async () => {
    if (!text.trim()) {
      toast({ title: "Sin texto", description: "Escribe algo antes de corregir.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setCorrections([]);
    setSummary("");
    setApplied(new Set());
    setFocusedIndex(0);

    try {
      const { data, error } = await supabase.functions.invoke("correct-manuscript", {
        body: { text, lang },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setCorrections(data.corrections || []);
      setSummary(data.summary || "");
      setHasAnalyzed(true);
    } catch (err: any) {
      console.error("AI correction error:", err);
      toast({
        title: "Error de corrección",
        description: err?.message || "No se pudo conectar con el servicio de IA.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (index: number, original: string, suggestion: string) => {
    onApplyCorrection(original, suggestion);
    setApplied((prev) => new Set(prev).add(index));
    // Auto-advance to next pending
    const nextPending = pendingIndices.find((i) => i > index);
    if (nextPending !== undefined) setFocusedIndex(nextPending);
    toast({ title: "Corrección aplicada" });
  };

  const handleApplyAllPending = () => {
    const pending = corrections
      .map((c, i) => ({ ...c, i }))
      .filter((c) => !applied.has(c.i));

    if (pending.length === 0) return;

    if (onApplyAll) {
      onApplyAll(pending.map((c) => ({ original: c.original, suggestion: c.suggestion })));
    } else {
      pending.forEach((c) => onApplyCorrection(c.original, c.suggestion));
    }

    setApplied(new Set(corrections.map((_, i) => i)));
    toast({ title: `${pending.length} correcciones aplicadas` });
  };

  const navigatePrev = () => {
    const prev = [...pendingIndices].reverse().find((i) => i < focusedIndex);
    if (prev !== undefined) setFocusedIndex(prev);
  };

  const navigateNext = () => {
    const next = pendingIndices.find((i) => i > focusedIndex);
    if (next !== undefined) setFocusedIndex(next);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setHasAnalyzed(false);
      setCorrections([]);
      setSummary("");
      setApplied(new Set());
      setFocusedIndex(0);
    }
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-gold" />
            Corrección con IA
          </SheetTitle>
          <SheetDescription className="text-xs">
            Detecta errores de ortografía, gramática, puntuación y estilo.
          </SheetDescription>
        </SheetHeader>

        {/* Pre-analysis */}
        {!hasAnalyzed && !loading && (
          <div className="flex flex-col items-center gap-4 py-8 px-4">
            <p className="text-sm text-muted-foreground text-center">
              Pulsa para analizar el capítulo actual (hasta 8.000 caracteres).
            </p>
            <Button variant="gold" onClick={analyze} disabled={!text.trim()}>
              <Sparkles className="w-4 h-4 mr-2" />
              Analizar texto
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="w-7 h-7 animate-spin text-gold" />
            <p className="text-sm text-muted-foreground">Analizando…</p>
          </div>
        )}

        {/* Results */}
        {hasAnalyzed && !loading && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Toolbar */}
            {corrections.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
                <span className="text-xs text-muted-foreground">
                  {pendingIndices.length} de {corrections.length} pendiente{pendingIndices.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={navigatePrev}
                    disabled={pendingIndices.length === 0 || pendingIndices[0] >= focusedIndex}
                    title="Error anterior"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={navigateNext}
                    disabled={pendingIndices.length === 0 || pendingIndices[pendingIndices.length - 1] <= focusedIndex}
                    title="Siguiente error"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="gold-outline"
                    size="sm"
                    className="h-7 text-xs ml-1"
                    onClick={handleApplyAllPending}
                    disabled={pendingIndices.length === 0}
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Aplicar todas
                  </Button>
                </div>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="mx-4 mt-3 rounded-lg border border-gold/20 bg-gold/5 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-0.5 text-xs">Resumen</p>
                <p>{summary}</p>
              </div>
            )}

            {/* Corrections list */}
            {corrections.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
                <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-sm font-medium text-foreground">¡Sin correcciones!</p>
                <p className="text-xs text-muted-foreground">Tu texto no presenta errores detectables.</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {corrections.map((c, i) => {
                    const isFocused = i === focusedIndex;
                    const isApplied = applied.has(i);
                    return (
                      <div
                        key={i}
                        id={`correction-${i}`}
                        className={`rounded-lg border p-3 transition-all cursor-pointer ${
                          isApplied
                            ? "border-green-500/30 bg-green-500/5 opacity-50"
                            : isFocused
                            ? "border-gold/50 bg-gold/5 ring-1 ring-gold/20"
                            : "border-border bg-card/50 hover:border-muted-foreground/30"
                        }`}
                        onClick={() => !isApplied && setFocusedIndex(i)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wider ${typeBadgeColor[c.type] || ""}`}
                          >
                            {c.type}
                          </Badge>
                          {!isApplied && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-gold hover:text-gold px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApply(i, c.original, c.suggestion);
                              }}
                            >
                              Aplicar
                            </Button>
                          )}
                          {isApplied && (
                            <span className="text-[10px] text-green-400 font-medium">✓ Aplicada</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <span className="line-through text-muted-foreground">{c.original}</span>
                          <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">{c.suggestion}</span>
                        </div>
                        {(isFocused || isApplied) && (
                          <p className="text-[11px] text-muted-foreground mt-1">{c.explanation}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Re-analyze footer */}
            <div className="flex justify-end px-4 py-2 border-t border-border mt-auto">
              <Button variant="outline" size="sm" className="text-xs" onClick={analyze}>
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Re-analizar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
