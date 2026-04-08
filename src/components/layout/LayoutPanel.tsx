import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  BookOpen, Loader2, Type, Columns, RulerIcon, ALargeSmall,
  ListTree, Settings2, Download, BookOpenCheck, FileText,
  PanelRightClose, PanelRightOpen, ZoomIn, ZoomOut, Maximize,
  Eye,
} from "lucide-react";
import BookPagePreview, { SubchapterMode, ViewMode, buildPages, SECTION_ORDER } from "./BookPagePreview";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChapters, Chapter } from "@/hooks/useChapters";
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
      fontSize, lineHeight, subchapterMode, insertBlankPages, scale,
    }).length;
  }, [chapters, activePage, marginH, marginV, marginInner, fontSize, lineHeight, subchapterMode, insertBlankPages, scale]);

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

      const sorted = [...chapters].sort((a, b) => {
        const oa = SECTION_ORDER[a.section_type] ?? 99;
        const ob = SECTION_ORDER[b.section_type] ?? 99;
        if (oa !== ob) return oa - ob;
        return a.position - b.position;
      });

      let pageNum = cover ? 2 : 1;
      let chapterCount = 0;

      for (const section of sorted) {
        if (!section.content.trim()) continue;
        const isChapter = section.section_type === "capitulo";
        const isSubchapter = section.section_type === "subcapitulo";

        const needsNewPage = isChapter || (!isSubchapter);
        const isContinue = isSubchapter && subchapterMode === "same-page";

        if (!isContinue) {
          if (!isFirstPage) pdf.addPage();
          isFirstPage = false;
          pageNum++;

          if (insertBlankPages && needsNewPage && pageNum % 2 === 0) {
            pdf.addPage(); // blank page
            pageNum++;
          }
        }

        if (isChapter) chapterCount++;

        // Header
        pdf.setTextColor(26, 26, 26);
        pdf.setFont("helvetica", "bold");
        let startY = mV;

        if (isChapter) {
          startY = mV + 20;
          pdf.setFontSize(10);
          pdf.setTextColor(136, 136, 136);
          pdf.text(`CAPÍTULO ${chapterCount}`, pageW / 2, startY, { align: "center" });
          startY += 8;
          pdf.setTextColor(26, 26, 26);
          pdf.setFontSize(16);
          pdf.text(section.title, pageW / 2, startY, { align: "center" });
          startY += 12;
        } else if (isSubchapter) {
          if (subchapterMode === "same-page") {
            // continue from current cursor - we need to track this
          }
          pdf.setFontSize(13);
          pdf.setFont("helvetica", "bold");
          startY = mV + 10;
          pdf.text(section.title, mInner, startY);
          startY += 8;
        } else {
          const labels: Record<string, string> = {
            dedicatoria: "DEDICATORIA", prologo: "PRÓLOGO",
            epilogo: "EPÍLOGO", agradecimientos: "AGRADECIMIENTOS",
          };
          startY = mV + 20;
          if (labels[section.section_type]) {
            pdf.setFontSize(10);
            pdf.setTextColor(136, 136, 136);
            pdf.text(labels[section.section_type], pageW / 2, startY, { align: "center" });
            startY += 8;
          }
          pdf.setTextColor(26, 26, 26);
          pdf.setFontSize(14);
          pdf.text(section.title, pageW / 2, startY, { align: "center" });
          startY += 10;
        }

        // Body
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(fSize);
        pdf.setTextColor(51, 51, 51);
        let cursorY = startY;

        const paragraphs = section.content.split("\n").filter((p) => p.trim());
        for (let pi = 0; pi < paragraphs.length; pi++) {
          const para = paragraphs[pi];
          const indent = pi > 0 ? 5 : 0;
          const lines = pdf.splitTextToSize(para, contentW - indent);
          for (let li = 0; li < lines.length; li++) {
            if (cursorY + lineHeightMm > pageH - mV) {
              pdf.addPage();
              pageNum++;
              cursorY = mV;
            }
            pdf.text(lines[li], (li === 0 ? mInner + indent : mInner), cursorY);
            cursorY += lineHeightMm;
          }
        }
      }

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
          {/* View mode toggle */}
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

          <Separator orientation="vertical" className="h-5" />

          {/* Export button */}
          <Button size="sm" variant="outline" onClick={handleExport} disabled={isExporting} className="gap-1.5 text-xs">
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isExporting ? "Generando…" : "Exportar PDF"}
          </Button>

          <Separator orientation="vertical" className="h-5" />

          {/* Settings toggle */}
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
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Book viewer */}
        <ScrollArea className="flex-1">
          <div className={cn(
            "min-h-full",
            "bg-gradient-to-b from-muted/40 to-muted/20",
          )}>
            <BookPagePreview
              chapters={chapters}
              pageW={activePage.w}
              pageH={activePage.h}
              marginH={marginH}
              marginV={marginV}
              marginInner={marginInner}
              fontFamily={activeFont.css}
              fontSize={fontSize}
              lineHeight={lineHeight}
              subchapterMode={subchapterMode}
              viewMode={viewMode}
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
