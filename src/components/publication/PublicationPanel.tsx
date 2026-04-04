import { useState, useMemo } from "react";
import { Download, Loader2, BookOpen, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useChapters, SECTION_TYPES, Chapter } from "@/hooks/useChapters";
import { useBookCover } from "@/hooks/useBookCover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

interface Props {
  bookId: string;
  bookTitle: string;
  bookSubtitle?: string | null;
  bookAuthor: string;
}

// Section ordering priority
const SECTION_ORDER: Record<string, number> = {
  dedicatoria: 0,
  prologo: 1,
  capitulo: 2,
  subcapitulo: 2.5,
  epilogo: 3,
  agradecimientos: 4,
  texto_libre: 5,
};

function sortedSections(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => {
    const orderA = SECTION_ORDER[a.section_type] ?? 2;
    const orderB = SECTION_ORDER[b.section_type] ?? 2;
    if (orderA !== orderB) return orderA - orderB;
    return a.position - b.position;
  });
}

function getSectionIcon(type: string) {
  return SECTION_TYPES.find((s) => s.value === type)?.icon ?? "📄";
}

function getSectionLabel(type: string) {
  return SECTION_TYPES.find((s) => s.value === type)?.label ?? "Sección";
}

// Page preview component for the publication view
function PublicationPage({
  children,
  pageNumber,
  isCover,
}: {
  children: React.ReactNode;
  pageNumber?: number;
  isCover?: boolean;
}) {
  const w = 360;
  const h = 540;

  return (
    <div className="relative" style={{ perspective: "1200px" }}>
      <div
        className="absolute rounded-sm bg-muted/30"
        style={{ width: w - 2, height: h - 2, top: 6, left: 6 }}
      />
      <div
        className="absolute rounded-sm bg-muted/15"
        style={{ width: w - 1, height: h - 1, top: 3, left: 3 }}
      />
      <div
        className={cn(
          "relative overflow-hidden",
          isCover ? "rounded-[2px_8px_8px_2px]" : "rounded-sm"
        )}
        style={{
          width: w,
          height: h,
          backgroundColor: isCover ? undefined : "white",
          boxShadow:
            "0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08), inset 0 0 0 0.5px rgba(0,0,0,0.08)",
        }}
      >
        {children}
        {pageNumber !== undefined && !isCover && (
          <span
            className="absolute bottom-0 left-0 right-0 text-center"
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "8px",
              color: "#aaa",
              paddingBottom: "12px",
              letterSpacing: "0.05em",
            }}
          >
            {pageNumber}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PublicationPanel({
  bookId,
  bookTitle,
  bookSubtitle,
  bookAuthor,
}: Props) {
  const { chapters, isLoading } = useChapters(bookId);
  const { cover } = useBookCover(bookId);
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const ordered = useMemo(() => sortedSections(chapters), [chapters]);

  const hasCover = !!cover;
  const totalSections = ordered.length;

  // Generate PDF
  const handleExport = async () => {
    if (!ordered.length) return;
    setIsExporting(true);

    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [152, 229] });
      const pageW = 152;
      const pageH = 229;
      const marginH = 20;
      const marginV = 25;
      const contentW = pageW - marginH * 2;
      const contentH = pageH - marginV * 2;
      const fontSize = 11;
      const lineHeightMm = fontSize * 0.3528 * 1.6; // pt to mm * line height factor
      let isFirstPage = true;

      // ── Cover page ──
      if (cover) {
        const bgHex = cover.bg_color || "#1a1a2e";
        const r = parseInt(bgHex.slice(1, 3), 16);
        const g = parseInt(bgHex.slice(3, 5), 16);
        const b = parseInt(bgHex.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(0, 0, pageW, pageH, "F");

        // Determine text color based on luminance
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const textR = lum > 0.55 ? 26 : 255;
        const textG = lum > 0.55 ? 26 : 255;
        const textB = lum > 0.55 ? 26 : 255;

        pdf.setTextColor(textR, textG, textB);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(24);
        const titleLines = pdf.splitTextToSize(cover.title || bookTitle, contentW);
        pdf.text(titleLines, pageW / 2, pageH * 0.35, { align: "center" });

        if (cover.subtitle) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(14);
          const subtLines = pdf.splitTextToSize(cover.subtitle, contentW);
          pdf.text(subtLines, pageW / 2, pageH * 0.35 + titleLines.length * 10 + 8, { align: "center" });
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(cover.author || bookAuthor, pageW / 2, pageH * 0.82, { align: "center" });

        isFirstPage = false;
      }

      // ── Content sections ──
      for (const section of ordered) {
        if (!section.content.trim()) continue;

        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        // Section title
        pdf.setTextColor(26, 26, 26);
        pdf.setFont("helvetica", "bold");

        const isMajorSection = ["dedicatoria", "prologo", "epilogo", "agradecimientos"].includes(section.section_type);

        if (isMajorSection) {
          pdf.setFontSize(16);
          const label = getSectionLabel(section.section_type).toUpperCase();
          pdf.text(label, pageW / 2, marginV + 20, { align: "center" });

          if (section.title !== getSectionLabel(section.section_type)) {
            pdf.setFontSize(13);
            pdf.setFont("helvetica", "normal");
            pdf.text(section.title, pageW / 2, marginV + 30, { align: "center" });
          }
        } else {
          pdf.setFontSize(16);
          pdf.text(section.title, pageW / 2, marginV + 20, { align: "center" });
        }

        // Body text
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(fontSize);
        pdf.setTextColor(51, 51, 51);

        const startY = marginV + (isMajorSection ? 40 : 32);
        let cursorY = startY;

        const paragraphs = section.content.split("\n").filter((p) => p.trim());
        for (const para of paragraphs) {
          const lines = pdf.splitTextToSize(para, contentW);
          for (const line of lines) {
            if (cursorY + lineHeightMm > pageH - marginV) {
              pdf.addPage();
              cursorY = marginV;
            }
            pdf.text(line, marginH, cursorY);
            cursorY += lineHeightMm;
          }
          cursorY += lineHeightMm * 0.4; // paragraph spacing
        }
      }

      pdf.save(`${bookTitle || "libro"}.pdf`);
      toast({ title: "PDF exportado", description: "Tu libro se ha descargado correctamente." });
    } catch (err) {
      console.error("PDF export error:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!chapters.length) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center gap-3">
        <BookOpen className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">No hay contenido para publicar. Escribe tu manuscrito primero.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-260px)] min-h-[500px]">
      {/* ── Sidebar: table of contents ── */}
      <div className="w-60 shrink-0 border-r border-border bg-muted/30">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Contenido del libro</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {totalSections} {totalSections === 1 ? "sección" : "secciones"}
            {hasCover && " · Portada incluida"}
          </p>
        </div>
        <ScrollArea className="h-[calc(100%-80px)]">
          <div className="p-2 space-y-0.5">
            {hasCover && (
              <div className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground flex items-center gap-2">
                <span>🖼️</span>
                <span>Portada</span>
              </div>
            )}
            {ordered.map((ch, i) => (
              <div
                key={ch.id}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground flex items-center gap-2"
              >
                <span>{getSectionIcon(ch.section_type)}</span>
                <span className="truncate flex-1">{ch.title}</span>
                {!ch.content.trim() && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">vacío</Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Export button */}
        <div className="p-3 border-t border-border">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar libro
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Book preview ── */}
      <div className="flex-1 bg-muted/20 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col items-center gap-12 py-12 px-6">
            {/* Cover preview */}
            {hasCover && cover && (
              <PublicationPage isCover>
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-8"
                  style={{
                    background: cover.use_gradient
                      ? `linear-gradient(160deg, ${cover.bg_color} 0%, ${cover.accent_color} 100%)`
                      : cover.bg_color,
                    borderRadius: "2px 8px 8px 2px",
                  }}
                >
                  {cover.bg_image_url && (
                    <>
                      <img
                        src={cover.bg_image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                    </>
                  )}
                  <div className="relative z-10 text-center flex flex-col items-center justify-center h-full gap-3">
                    <h2
                      className="font-bold leading-tight"
                      style={{
                        fontSize: "1.6rem",
                        color: cover.bg_image_url ? "#fff" : getTextColor(cover.bg_color),
                      }}
                    >
                      {cover.title || bookTitle}
                    </h2>
                    {cover.subtitle && (
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: cover.bg_image_url ? "rgba(255,255,255,0.75)" : getTextColor(cover.bg_color),
                          opacity: 0.7,
                        }}
                      >
                        {cover.subtitle}
                      </p>
                    )}
                    <p
                      className="mt-auto"
                      style={{
                        fontSize: "0.8rem",
                        color: cover.bg_image_url ? "rgba(255,255,255,0.85)" : getTextColor(cover.bg_color),
                        opacity: 0.8,
                      }}
                    >
                      {cover.author || bookAuthor}
                    </p>
                  </div>
                </div>
              </PublicationPage>
            )}

            {/* Section pages */}
            {ordered.map((section) => {
              if (!section.content.trim()) return null;
              const isMajor = ["dedicatoria", "prologo", "epilogo", "agradecimientos"].includes(section.section_type);

              return (
                <PublicationPage key={section.id} pageNumber={undefined}>
                  <div className="p-8 h-full flex flex-col" style={{ fontFamily: "Georgia, serif" }}>
                    {/* Section header */}
                    <div className={cn("mb-4", isMajor ? "text-center pt-8" : "text-center pt-4")}>
                      {isMajor && (
                        <span
                          className="block text-xs tracking-[0.2em] uppercase mb-2"
                          style={{ color: "#999" }}
                        >
                          {getSectionLabel(section.section_type)}
                        </span>
                      )}
                      <h3
                        className="font-semibold"
                        style={{
                          fontSize: isMajor ? "1.1rem" : "1rem",
                          color: "#1a1a1a",
                          lineHeight: 1.3,
                        }}
                      >
                        {section.title}
                      </h3>
                    </div>

                    {/* Content preview (first portion) */}
                    <div
                      className="flex-1 overflow-hidden"
                      style={{
                        fontSize: "8.5px",
                        lineHeight: 1.7,
                        color: "#333",
                        textAlign: "justify",
                        hyphens: "auto",
                      }}
                    >
                      {section.content
                        .split("\n")
                        .filter((p) => p.trim())
                        .slice(0, 12)
                        .map((para, j) => (
                          <p
                            key={j}
                            style={{
                              margin: 0,
                              marginBottom: "4px",
                              textIndent: j > 0 ? "12px" : "0",
                            }}
                          >
                            {para}
                          </p>
                        ))}
                    </div>
                  </div>
                </PublicationPage>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* ── Info panel ── */}
      <div className="w-64 shrink-0 border-l border-border bg-muted/30 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Resumen</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Título</p>
            <p className="text-sm font-medium text-foreground">{bookTitle}</p>
          </div>
          {bookSubtitle && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subtítulo</p>
              <p className="text-sm text-foreground">{bookSubtitle}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Autor</p>
            <p className="text-sm text-foreground">{bookAuthor || "Sin autor"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Secciones</p>
            <p className="text-sm text-foreground">{totalSections}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Palabras totales</p>
            <p className="text-sm text-foreground">
              {chapters.reduce((sum, ch) => sum + ch.word_count, 0).toLocaleString("es-ES")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Portada</p>
            <p className="text-sm text-foreground">{hasCover ? "Configurada ✓" : "Sin portada"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Formato</p>
            <p className="text-sm text-foreground">PDF (6×9")</p>
          </div>

          <div className="pt-2">
            <div className="rounded-lg bg-accent/10 p-3">
              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-accent-foreground">
                  La vista previa muestra la primera página de cada sección. El PDF exportado incluirá todo el contenido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace("#", "");
  if (hex.length < 6) return "#ffffff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1a1a1a" : "#ffffff";
}
