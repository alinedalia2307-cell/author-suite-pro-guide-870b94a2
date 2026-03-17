import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, Loader2, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useChapters, type Chapter } from "@/hooks/useChapters";

// ── Types ──

type CorrectionType = "ortografia" | "gramatica" | "tipografia" | "claridad";

interface Correction {
  id: string;
  type: CorrectionType;
  original: string;
  suggestion: string;
  context: string;
  status: "pending" | "accepted" | "rejected";
}

const TYPE_META: Record<CorrectionType, { label: string; color: string }> = {
  ortografia:  { label: "Ortografía",  color: "bg-destructive/10 text-destructive border-destructive/20" },
  gramatica:   { label: "Gramática",   color: "bg-accent/15 text-accent-foreground border-accent/30" },
  tipografia:  { label: "Tipografía",  color: "bg-primary/10 text-primary border-primary/20" },
  claridad:    { label: "Claridad",    color: "bg-secondary text-secondary-foreground border-border" },
};

// ── Mock data generator ──

function generateMockCorrections(chapter: Chapter): Correction[] {
  const words = chapter.content.trim().split(/\s+/).filter(Boolean);
  if (words.length < 3) return [];

  const mocks: Correction[] = [];
  const types: CorrectionType[] = ["ortografia", "gramatica", "tipografia", "claridad"];

  // Generate 3-6 mock corrections based on content length
  const count = Math.min(Math.max(3, Math.floor(words.length / 50)), 6);

  const samples: Array<{ type: CorrectionType; original: string; suggestion: string; context: string }> = [
    { type: "ortografia", original: "travez", suggestion: "través", context: "…a travez del camino…" },
    { type: "ortografia", original: "aver", suggestion: "a ver", context: "…vamos aver qué pasa…" },
    { type: "gramatica", original: "habían muchas personas", suggestion: "había muchas personas", context: "…en la plaza habían muchas personas reunidas…" },
    { type: "gramatica", original: "le dijo a ellos", suggestion: "les dijo", context: "…entonces le dijo a ellos que…" },
    { type: "tipografia", original: 'dijo "hola"', suggestion: "dijo «hola»", context: '…el protagonista dijo "hola" al entrar…' },
    { type: "tipografia", original: "...", suggestion: "…", context: "…esperó un momento... y continuó…" },
    { type: "claridad", original: "La cosa esa que estaba ahí", suggestion: "El objeto que se encontraba en la mesa", context: "…La cosa esa que estaba ahí le llamó la atención…" },
    { type: "claridad", original: "Hizo la cosa", suggestion: "Realizó la tarea encomendada", context: "…Al llegar, hizo la cosa sin demora…" },
  ];

  for (let i = 0; i < count; i++) {
    const sample = samples[i % samples.length];
    mocks.push({
      id: `${chapter.id}-corr-${i}`,
      type: sample.type,
      original: sample.original,
      suggestion: sample.suggestion,
      context: sample.context,
      status: "pending",
    });
  }

  return mocks;
}

// ── Component ──

interface Props {
  bookId: string;
}

export default function CorrectionPanel({ bookId }: Props) {
  const { chapters, activeId, content, isLoading, selectChapter } = useChapters(bookId);
  const [corrections, setCorrections] = useState<Record<string, Correction[]>>({});
  const [filterType, setFilterType] = useState<CorrectionType | "all">("all");

  const activeChapter = chapters.find((c) => c.id === activeId);

  // Generate mock corrections on first view of a chapter
  const chapterCorrections = useMemo(() => {
    if (!activeId || !activeChapter) return [];
    if (corrections[activeId]) return corrections[activeId];

    const mocks = generateMockCorrections(activeChapter);
    // We can't setState in useMemo, so we use a lazy init pattern
    return mocks;
  }, [activeId, activeChapter, corrections]);

  // Lazy populate corrections state
  if (activeId && !corrections[activeId] && chapterCorrections.length > 0) {
    setCorrections((prev) => ({ ...prev, [activeId]: chapterCorrections }));
  }

  const filteredCorrections = filterType === "all"
    ? chapterCorrections
    : chapterCorrections.filter((c) => c.type === filterType);

  const pendingCount = chapterCorrections.filter((c) => c.status === "pending").length;
  const acceptedCount = chapterCorrections.filter((c) => c.status === "accepted").length;
  const rejectedCount = chapterCorrections.filter((c) => c.status === "rejected").length;

  const handleAccept = (id: string) => {
    if (!activeId) return;
    setCorrections((prev) => ({
      ...prev,
      [activeId]: (prev[activeId] ?? []).map((c) =>
        c.id === id ? { ...c, status: "accepted" as const } : c
      ),
    }));
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

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[500px]">
      {/* Chapter sidebar */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-border bg-secondary/20">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capítulos</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col py-1">
            {chapters.map((ch) => {
              const chCorr = corrections[ch.id] ?? [];
              const chPending = chCorr.filter((c) => c.status === "pending").length;
              return (
                <div
                  key={ch.id}
                  className={`flex items-center justify-between mx-1 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                    ch.id === activeId
                      ? "bg-card text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                  }`}
                  onClick={() => selectChapter(ch.id)}
                >
                  <span className="truncate flex-1 min-w-0">{ch.title}</span>
                  {chPending > 0 && (
                    <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 h-5 bg-destructive/10 text-destructive border-destructive/20">
                      {chPending}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex min-w-0">
        {/* Chapter content preview */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-card">
          <div className="px-6 py-2 border-b border-border">
            <h3 className="font-display text-sm font-semibold text-foreground truncate">
              {activeChapter?.title ?? "Sin título"}
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="max-w-2xl mx-auto px-8 py-8">
              <p className="font-body text-base leading-[1.9] text-foreground whitespace-pre-wrap">
                {content || <span className="text-muted-foreground/40 italic">Capítulo vacío</span>}
              </p>
            </div>
          </ScrollArea>
        </div>

        {/* Corrections sidebar */}
        <aside className="w-80 shrink-0 flex flex-col bg-secondary/10">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sugerencias</span>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{pendingCount} pendientes</span>
                <span className="text-accent">✓ {acceptedCount}</span>
                <span className="text-destructive/60">✗ {rejectedCount}</span>
              </div>
            </div>
            {/* Filter chips */}
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

          {/* Corrections list */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2 p-3">
              {filteredCorrections.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No hay sugerencias{filterType !== "all" ? ` de ${TYPE_META[filterType as CorrectionType].label.toLowerCase()}` : ""}.
                </p>
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
                  {/* Type badge */}
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

                  {/* Context */}
                  <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                    {corr.context}
                  </p>

                  {/* Original → Suggestion */}
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

                  {/* Actions */}
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
      </div>
    </div>
  );
}
