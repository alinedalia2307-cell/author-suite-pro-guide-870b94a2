import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  BookOpen, Loader2, Type, Columns, RulerIcon, ALargeSmall,
  ListTree, Settings2, Download, BookOpenCheck, FileText,
  PanelRightClose, PanelRightOpen, ZoomIn, ZoomOut,
  Eye,
} from "lucide-react";
import BookPagePreview from "./BookPagePreview";
// Pagination + ordering helpers come from the shared engine so the on-screen
// page count and the PDF exporter never drift apart.
import {
  buildPages,
  resolveFootnoteGroupId,
  sortChaptersForLayout,
  type SubchapterMode,
  type ViewMode,
} from "@/lib/layout/paginate";
// Phase 2.1: parallel PDF renderer based on PageContent. Kept behind a
// feature flag below; the legacy exporter remains the active one.
import { renderPagesToPdf } from "@/lib/layout/renderPdf";

// Feature flag for the new PageContent-based PDF renderer.
// Keep false until validated — flipping to true swaps the body of the PDF
// (the cover is still drawn by the legacy code path before delegation).
const USE_PAGECONTENT_RENDERER = true;
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChapters } from "@/hooks/useChapters";
import { useAllFootnotes, FOOTNOTE_REGEX } from "@/hooks/useFootnotes";
import { useBookCover } from "@/hooks/useBookCover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

interface Props {
  bookId: string;
}

const PAGE_SIZES = [
  { value: "a4", label: "A4 (210 × 297 mm)", w: 210, h: 297 },
  { value: "a5", label: "A5 (148 × 210 mm)", w: 148, h: 210 },
  { value: "letter", label: "Carta (216 × 279 mm)", w: 216, h: 279 },
  { value: "6x9", label: '6 × 9" (152 × 229 mm)', w: 152, h: 229 },
  { value: "5x8", label: '5 × 8" (127 × 203 mm)', w: 127, h: 203 },
];

const FONTS = [
  { value: "serif", label: "Georgia", css: "Georgia, 'Times New Roman', serif" },
  { value: "garamond", label: "EB Garamond", css: "'EB Garamond', Garamond, serif" },
  { value: "merriweather", label: "Merriweather", css: "'Merriweather', Georgia, serif" },
  { value: "lora", label: "Lora", css: "'Lora', Georgia, serif" },
  { value: "sans", label: "Source Sans", css: "'Source Sans 3', sans-serif" },
];

const ZOOM_MIN = 50;
const ZOOM_MAX = 250;
const ZOOM_STEP = 10;
const ZOOM_DEFAULT = 130;

export default function LayoutPanel({ bookId }: Props) {
  const { chapters, isLoading } = useChapters(bookId);
  const { data: allFootnotes = [] } = useAllFootnotes(chapters.map((c) => c.id));
  const { cover } = useBookCover(bookId);
  const { toast } = useToast();
  const viewerRef = useRef<HTMLDivElement>(null);

  const [pageSize, setPageSize] = useState("a5");
  const [font, setFont] = useState("serif");
  const [fontSize, setFontSize] = useState(12);
  const [lineHeight, setLineHeight] = useState(1.4);
  const [marginH, setMarginH] = useState(18);
  const [marginV, setMarginV] = useState(22);
  const [marginInner, setMarginInner] = useState(25);
  const [subchapterMode, setSubchapterMode] = useState<SubchapterMode>("same-page");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [insertBlankPages, setInsertBlankPages] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [readingMode, setReadingMode] = useState(false);

  const activePage = PAGE_SIZES.find((p) => p.value === pageSize) ?? PAGE_SIZES[1];
  const activeFont = FONTS.find((f) => f.value === font) ?? FONTS[0];

  const scale = useMemo(() => {
    return (zoom / 100) * (activePage.w > 200 ? 0.85 : 1);
  }, [zoom, activePage.w]);

  // Ctrl + wheel zoom
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + delta));
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const toggleReadingMode = useCallback(() => {
    setReadingMode((prev) => {
      if (!prev) {
        setViewMode("single");
        setSettingsOpen(false);
        setZoom(180);
      } else {
        setZoom(ZOOM_DEFAULT);
      }
      return !prev;
    });
  }, []);

  const totalPages = useMemo(() => {
    if (!chapters.length) return 0;
    return buildPages(chapters, {
      pageW: activePage.w, pageH: activePage.h, marginH, marginV, marginInner,
      fontSize, lineHeight, subchapterMode, insertBlankPages, scale, footnotes: allFootnotes,
    }).length;
  }, [chapters, allFootnotes, activePage, marginH, marginV, marginInner, fontSize, lineHeight, subchapterMode, insertBlankPages, scale]);

  // PDF export
  const handleExport = async () => {
    if (!chapters.length) return;
    setIsExporting(true);

    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [activePage.w, activePage.h] });
      const pageW = activePage.w;
      const pageH = activePage.h;
      const mH = marginH;
      const mV = marginV;
      const mInner = marginInner;
      const contentW = pageW - mH - mInner;
      const fSize = fontSize;
      const lineHeightMm = fSize * 0.3528 * lineHeight;
      let isFirstPage = true;

      // Cover page
      if (cover) {
        const bgHex = cover.bg_color || "#1a1a2e";
        const r = parseInt(bgHex.slice(1, 3), 16);
        const g = parseInt(bgHex.slice(3, 5), 16);
        const b = parseInt(bgHex.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(0, 0, pageW, pageH, "F");
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const tc = lum > 0.55 ? 26 : 255;
        pdf.setTextColor(tc, tc, tc);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(24);
        const titleLines = pdf.splitTextToSize(cover.title || "", contentW);
        pdf.text(titleLines, pageW / 2, pageH * 0.35, { align: "center" });
        if (cover.subtitle) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(14);
          pdf.text(pdf.splitTextToSize(cover.subtitle, contentW), pageW / 2, pageH * 0.35 + titleLines.length * 10 + 8, { align: "center" });
        }
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(cover.author || "", pageW / 2, pageH * 0.82, { align: "center" });
        isFirstPage = false;
      }

      // ── Phase 2.1 parallel renderer (flag-gated, default OFF) ──────────
      // When enabled, paint the body from PageContent produced by the
      // shared pagination engine. Cover (above) is unchanged.
      if (USE_PAGECONTENT_RENDERER) {
        const pages = buildPages(chapters, {
          pageW: activePage.w, pageH: activePage.h,
          marginH, marginV, marginInner,
          fontSize, lineHeight, subchapterMode,
          insertBlankPages, scale, footnotes: allFootnotes,
        });
        renderPagesToPdf(
          pdf,
          pages,
          { pageW, pageH, marginH: mH, marginV: mV, marginInner: mInner, fontSize: fSize, lineHeight },
          !!cover,
        );
        pdf.save(`${cover?.title || "libro"}.pdf`);
        toast({ title: "PDF exportado", description: `${pages.length} páginas generadas correctamente.` });
        return;
      }

      const sorted = sortChaptersForLayout(chapters);

      let pageNum = cover ? 2 : 1;
      let chapterCount = 0;
      const fnLineHeightMm = (fSize - 2) * 0.3528 * 1.4;

      // Pending footnotes for current chapter (rendered at end of chapter)
      let pendingChapterFns: { n: number; content: string }[] = [];
      let currentChapterGroupId: string | null = null;
      let activeFootnoteGroupId: string | null = null;
      let cursorY = mV;

      const ensureSpace = (h: number) => {
        if (cursorY + h > pageH - mV) {
          pdf.addPage();
          pageNum++;
          cursorY = mV;
        }
      };

      const flushChapterFootnotes = () => {
        if (!pendingChapterFns.length) return;
        // Heading "Notas"
        ensureSpace(fnLineHeightMm * 3);
        cursorY += fnLineHeightMm * 0.6;
        pdf.setDrawColor(136, 136, 136);
        pdf.setLineWidth(0.2);
        pdf.line(mInner, cursorY, mInner + contentW * 0.3, cursorY);
        cursorY += fnLineHeightMm * 0.6;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(fSize - 1);
        pdf.setTextColor(85, 85, 85);
        pdf.text("NOTAS", mInner, cursorY);
        cursorY += fnLineHeightMm * 1.2;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(fSize - 2);
        pdf.setTextColor(68, 68, 68);
        for (const f of pendingChapterFns) {
          const text = `${f.n}. ${f.content || "(sin contenido)"}`;
          const lines = pdf.splitTextToSize(text, contentW);
          for (const ln of lines) {
            ensureSpace(fnLineHeightMm);
            pdf.text(ln, mInner, cursorY);
            cursorY += fnLineHeightMm;
          }
          cursorY += fnLineHeightMm * 0.2;
        }
        pendingChapterFns = [];
      };

      for (let si = 0; si < sorted.length; si++) {
        const section = sorted[si];
        if (!section.content.trim()) continue;
        const isChapter = section.section_type === "capitulo";
        const isSubchapter = section.section_type === "subcapitulo";

        const isContinue = isSubchapter && subchapterMode === "same-page";

        if (isChapter) currentChapterGroupId = section.id;
        else if (!isSubchapter) currentChapterGroupId = null;

        const footnoteGroupId = resolveFootnoteGroupId(section, currentChapterGroupId);

        if (activeFootnoteGroupId !== null && footnoteGroupId !== activeFootnoteGroupId) {
          flushChapterFootnotes();
        }

        activeFootnoteGroupId = footnoteGroupId;

        if (!isContinue) {
          if (!isFirstPage) pdf.addPage();
          isFirstPage = false;
          pageNum++;
          cursorY = mV;

          // Blank page goes BEFORE the chapter header so the header is only
          // painted once, on the recto page right after the blank.
          if (insertBlankPages && (isChapter || !isSubchapter) && pageNum % 2 === 0) {
            pdf.addPage();
            pageNum++;
            cursorY = mV;
          }
        }

        // Increment chapter counter exactly once per real chapter section.
        if (isChapter) {
          chapterCount++;
        }

        // Build numbering for this chapter (continuous per chapter)
        const chapterFns = allFootnotes.filter((f) => f.chapter_id === section.id);
        const numbering = new Map<string, number>();
        const reN = new RegExp(FOOTNOTE_REGEX.source, "g");
        let mn: RegExpExecArray | null;
        let counter = 0;
        while ((mn = reN.exec(section.content)) !== null) {
          if (!numbering.has(mn[1])) {
            counter++;
            numbering.set(mn[1], counter);
          }
        }

        // Header
        pdf.setTextColor(26, 26, 26);
        pdf.setFont("helvetica", "bold");

        if (isChapter) {
          cursorY = mV + 20;
          pdf.setFontSize(10);
          pdf.setTextColor(136, 136, 136);
          pdf.text(`CAPÍTULO ${chapterCount}`, pageW / 2, cursorY, { align: "center" });
          cursorY += 8;
          // Avoid duplicating the chapter label when section.title is itself
          // just "Capítulo N" (any case / spacing). Only render section.title
          // when it carries a real, distinct title.
          const titleNormHeader = (section.title || "").trim().replace(/\s+/g, " ");
          const isPlainChapterLabel = new RegExp(
            `^cap[ií]tulo\\s+${chapterCount}\\s*$`,
            "i"
          ).test(titleNormHeader);
          if (!isPlainChapterLabel && titleNormHeader.length > 0) {
            pdf.setTextColor(26, 26, 26);
            pdf.setFontSize(16);
            pdf.text(section.title, pageW / 2, cursorY, { align: "center" });
            cursorY += 12;
          } else {
            cursorY += 4;
          }
        } else if (isSubchapter) {
          pdf.setFontSize(13);
          pdf.setFont("helvetica", "bold");
          cursorY += 6;
          pdf.text(section.title, mInner, cursorY);
          cursorY += 8;
        } else {
          const labels: Record<string, string> = {
            dedicatoria: "DEDICATORIA", prologo: "PRÓLOGO",
            epilogo: "EPÍLOGO", agradecimientos: "AGRADECIMIENTOS",
          };
          cursorY = mV + 20;
          if (labels[section.section_type]) {
            pdf.setFontSize(10);
            pdf.setTextColor(136, 136, 136);
            pdf.text(labels[section.section_type], pageW / 2, cursorY, { align: "center" });
            cursorY += 8;
          }
          pdf.setTextColor(26, 26, 26);
          pdf.setFontSize(14);
          pdf.text(section.title, pageW / 2, cursorY, { align: "center" });
          cursorY += 10;
        }

        // Body
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(fSize);
        pdf.setTextColor(51, 51, 51);

        const paragraphs = section.content.split("\n").filter((p) => p.trim());

        // Collect footnotes from the FULL content first, so the visual filter
        // below (which may strip a duplicated title line) cannot cause notes
        // to be lost. Guarded against duplicates by checking pendingChapterFns.
        {
          const reCollect = new RegExp(FOOTNOTE_REGEX.source, "g");
          let mc: RegExpExecArray | null;
          while ((mc = reCollect.exec(section.content)) !== null) {
            const n = numbering.get(mc[1]);
            if (n !== undefined && !pendingChapterFns.some((p) => p.n === n)) {
              const fn = chapterFns.find((f) => f.marker === mc![1]);
              pendingChapterFns.push({ n, content: fn?.content ?? "" });
            }
          }
        }

        // The chapter header ("CAPÍTULO N" + title) is already drawn above.
        // If the author also wrote the title as the first line of the body
        // (e.g. "Capítulo 1", "CAPÍTULO 1: Título" or the bare title), strip
        // it so it doesn't appear duplicated in the PDF.
        if ((isChapter || !isSubchapter) && paragraphs.length > 0) {
          const first = paragraphs[0].trim().replace(/\s+/g, " ");
          const titleNorm = (section.title || "").trim().replace(/\s+/g, " ");
          const chapterPattern = isChapter
            ? new RegExp(`^cap[ií]tulo\\s+${chapterCount}\\b\\s*[:\\.\\-–—]?\\s*(.*)$`, "i")
            : null;
          const matchesTitle = titleNorm.length > 0 && first.toLowerCase() === titleNorm.toLowerCase();
          const matchesChapterLabel = chapterPattern ? chapterPattern.test(first) : false;
          if (matchesTitle || matchesChapterLabel) {
            paragraphs.shift();
          }
        }

        for (let pi = 0; pi < paragraphs.length; pi++) {
          let para = paragraphs[pi];
          // Footnotes already collected above from full content — only do
          // the marker→[N] replacement here for the visible body.
          para = para.replace(new RegExp(FOOTNOTE_REGEX.source, "g"), (_, mk) => {
            const n = numbering.get(mk);
            return n !== undefined ? `[${n}]` : "";
          });

          const indent = pi > 0 ? 5 : 0;
          const lines = pdf.splitTextToSize(para, contentW - indent);

          for (let li = 0; li < lines.length; li++) {
            if (cursorY + lineHeightMm > pageH - mV) {
              pdf.addPage();
              pageNum++;
              cursorY = mV;
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(fSize);
              pdf.setTextColor(51, 51, 51);
            }
            pdf.text(lines[li], (li === 0 ? mInner + indent : mInner), cursorY);
            cursorY += lineHeightMm;
          }
        }
      }

      // Flush footnotes of the very last chapter
      flushChapterFootnotes();

      pdf.save(`${cover?.title || "libro"}.pdf`);
      toast({ title: "PDF exportado", description: `${totalPages} páginas generadas correctamente.` });
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
        <p className="text-muted-foreground">No hay capítulos para maquetar. Escribe tu manuscrito primero.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[500px]">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <BookOpenCheck className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Maquetación</span>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs text-muted-foreground">{totalPages} páginas</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
              disabled={zoom <= ZOOM_MIN}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <div className="w-24">
              <Slider
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={ZOOM_STEP}
                className="w-full"
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
              disabled={zoom >= ZOOM_MAX}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] text-muted-foreground w-9 text-center tabular-nums">{zoom}%</span>
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* View mode toggle */}
          {!readingMode && (
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("single")}
                className={cn(
                  "px-2.5 py-1.5 text-xs transition-colors",
                  viewMode === "single" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("double")}
                className={cn(
                  "px-2.5 py-1.5 text-xs transition-colors",
                  viewMode === "double" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Reading mode */}
          <Button
            size="sm"
            variant={readingMode ? "default" : "ghost"}
            onClick={toggleReadingMode}
            className="gap-1.5 text-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            {readingMode ? "Salir lectura" : "Modo lectura"}
          </Button>

          <Separator orientation="vertical" className="h-5" />

          {/* Export button */}
          <Button size="sm" variant="outline" onClick={handleExport} disabled={isExporting} className="gap-1.5 text-xs">
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isExporting ? "Generando…" : "Exportar PDF"}
          </Button>

          {!readingMode && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <Button
                size="sm"
                variant={settingsOpen ? "default" : "ghost"}
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="gap-1.5 text-xs"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Ajustes
                {settingsOpen ? <PanelRightClose className="w-3 h-3" /> : <PanelRightOpen className="w-3 h-3" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Book viewer */}
        <ScrollArea className="flex-1">
          <div
            ref={viewerRef}
            className={cn(
              "min-h-full",
              readingMode
                ? "bg-[hsl(var(--muted)/0.15)]"
                : "bg-gradient-to-b from-muted/40 to-muted/20",
            )}
          >
            <BookPagePreview
              chapters={chapters}
              footnotes={allFootnotes}
              pageW={activePage.w}
              pageH={activePage.h}
              marginH={marginH}
              marginV={marginV}
              marginInner={marginInner}
              fontFamily={activeFont.css}
              fontSize={fontSize}
              lineHeight={lineHeight}
              subchapterMode={subchapterMode}
              viewMode={readingMode ? "single" : viewMode}
              insertBlankPages={insertBlankPages}
              scale={scale}
            />
          </div>
        </ScrollArea>

        {/* Collapsible settings panel */}
        {settingsOpen && (
          <div className="w-72 shrink-0 border-l border-border bg-card overflow-hidden animate-in slide-in-from-right-5 duration-200">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-5">
                {/* Page size */}
                <SettingGroup icon={<Columns className="w-3.5 h-3.5" />} label="Tamaño de página">
                  <Select value={pageSize} onValueChange={setPageSize}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingGroup>

                <Separator />

                {/* Font */}
                <SettingGroup icon={<Type className="w-3.5 h-3.5" />} label="Tipografía">
                  <Select value={font} onValueChange={setFont}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONTS.map((f) => (
                        <SelectItem key={f.value} value={f.value} className="text-xs">
                          <span style={{ fontFamily: f.css }}>{f.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingGroup>

                <Separator />

                {/* Font size */}
                <SettingGroup icon={<ALargeSmall className="w-3.5 h-3.5" />} label="Tamaño de fuente">
                  <div className="flex items-center gap-2">
                    <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={8} max={18} step={0.5} className="flex-1" />
                    <span className="text-xs text-foreground w-9 text-right tabular-nums">{fontSize}pt</span>
                  </div>
                </SettingGroup>

                {/* Line height */}
                <SettingGroup icon={<RulerIcon className="w-3.5 h-3.5" />} label="Interlineado">
                  <div className="flex items-center gap-2">
                    <Slider value={[lineHeight]} onValueChange={([v]) => setLineHeight(v)} min={1.0} max={2.0} step={0.05} className="flex-1" />
                    <span className="text-xs text-foreground w-9 text-right tabular-nums">{lineHeight.toFixed(2)}</span>
                  </div>
                </SettingGroup>

                <Separator />

                {/* Margins */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Márgenes</Label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Exterior</span>
                      <div className="flex items-center gap-2 w-36">
                        <Slider value={[marginH]} onValueChange={([v]) => setMarginH(v)} min={10} max={40} step={1} className="flex-1" />
                        <span className="text-xs w-10 text-right tabular-nums">{marginH}mm</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Interior (lomo)</span>
                      <div className="flex items-center gap-2 w-36">
                        <Slider value={[marginInner]} onValueChange={([v]) => setMarginInner(v)} min={15} max={45} step={1} className="flex-1" />
                        <span className="text-xs w-10 text-right tabular-nums">{marginInner}mm</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Vertical</span>
                      <div className="flex items-center gap-2 w-36">
                        <Slider value={[marginV]} onValueChange={([v]) => setMarginV(v)} min={10} max={40} step={1} className="flex-1" />
                        <span className="text-xs w-10 text-right tabular-nums">{marginV}mm</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Blank pages */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-normal">Páginas en blanco entre capítulos</Label>
                  <Switch checked={insertBlankPages} onCheckedChange={setInsertBlankPages} />
                </div>

                {/* Subchapter mode */}
                <SettingGroup icon={<ListTree className="w-3.5 h-3.5" />} label="Subcapítulos">
                  <RadioGroup value={subchapterMode} onValueChange={(v) => setSubchapterMode(v as SubchapterMode)}>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="same-page" id="sub-same" className="mt-0.5" />
                      <Label htmlFor="sub-same" className="text-xs font-normal cursor-pointer leading-snug">
                        Continúan en la misma página
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="new-page" id="sub-new" className="mt-0.5" />
                      <Label htmlFor="sub-new" className="text-xs font-normal cursor-pointer leading-snug">
                        Cada uno en página nueva
                      </Label>
                    </div>
                  </RadioGroup>
                </SettingGroup>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingGroup({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}
