import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ArrowRight, AlertCircle } from "lucide-react";
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
}: AiCorrectionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [summary, setSummary] = useState("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const analyze = async () => {
    if (!text.trim()) {
      toast({ title: "Sin texto", description: "Escribe algo en el capítulo antes de corregir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setCorrections([]);
    setSummary("");
    setApplied(new Set());

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
    toast({ title: "Corrección aplicada" });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setHasAnalyzed(false);
      setCorrections([]);
      setSummary("");
      setApplied(new Set());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            Corrección con IA
          </DialogTitle>
          <DialogDescription>
            Analiza tu manuscrito para detectar errores de ortografía, gramática, puntuación y estilo.
          </DialogDescription>
        </DialogHeader>

        {!hasAnalyzed && !loading && (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Pulsa el botón para analizar el contenido del capítulo actual.
              Se revisarán hasta 8.000 caracteres.
            </p>
            <Button variant="gold" onClick={analyze} disabled={!text.trim()}>
              <Sparkles className="w-4 h-4 mr-2" />
              Analizar texto
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
            <p className="text-sm text-muted-foreground">Analizando tu manuscrito…</p>
          </div>
        )}

        {hasAnalyzed && !loading && (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            {summary && (
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Resumen</p>
                <p>{summary}</p>
              </div>
            )}

            {corrections.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-sm font-medium text-foreground">¡Sin correcciones!</p>
                <p className="text-xs text-muted-foreground">Tu texto no presenta errores detectables.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {corrections.length} corrección{corrections.length !== 1 ? "es" : ""} encontrada{corrections.length !== 1 ? "s" : ""}
                </p>
                <ScrollArea className="flex-1 max-h-[400px]">
                  <div className="space-y-3 pr-3">
                    {corrections.map((c, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 transition-colors ${
                          applied.has(i) ? "border-green-500/30 bg-green-500/5 opacity-60" : "border-border bg-card/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wider ${typeBadgeColor[c.type] || ""}`}
                          >
                            {c.type}
                          </Badge>
                          {!applied.has(i) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-gold hover:text-gold"
                              onClick={() => handleApply(i, c.original, c.suggestion)}
                            >
                              Aplicar
                            </Button>
                          )}
                          {applied.has(i) && (
                            <span className="text-xs text-green-400">Aplicada</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <span className="line-through text-muted-foreground">{c.original}</span>
                          <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">{c.suggestion}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.explanation}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={analyze}>
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Re-analizar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
