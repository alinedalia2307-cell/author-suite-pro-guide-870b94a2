import { useState } from "react";
import { BookOpen, Loader2, Type, Columns, RulerIcon, ALargeSmall } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import BookPagePreview from "./BookPagePreview";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useChapters, Chapter } from "@/hooks/useChapters";
import { cn } from "@/lib/utils";

interface Props {
  bookId: string;
}

const PAGE_SIZES = [
  { value: "a4", label: "A4 (210 × 297 mm)", w: 210, h: 297 },
  { value: "a5", label: "A5 (148 × 210 mm)", w: 148, h: 210 },
  { value: "letter", label: "Carta (216 × 279 mm)", w: 216, h: 279 },
  { value: "6x9", label: "6 × 9\" (152 × 229 mm)", w: 152, h: 229 },
  { value: "5x8", label: "5 × 8\" (127 × 203 mm)", w: 127, h: 203 },
];

const FONTS = [
  { value: "serif", label: "Georgia", css: "Georgia, 'Times New Roman', serif" },
  { value: "garamond", label: "EB Garamond", css: "'EB Garamond', Garamond, serif" },
  { value: "merriweather", label: "Merriweather", css: "'Merriweather', Georgia, serif" },
  { value: "lora", label: "Lora", css: "'Lora', Georgia, serif" },
  { value: "sans", label: "Source Sans", css: "'Source Sans 3', sans-serif" },
];

export default function LayoutPanel({ bookId }: Props) {
  const { chapters, activeId, content, isLoading, selectChapter } = useChapters(bookId);

  // Layout settings
  const [pageSize, setPageSize] = useState("a5");
  const [font, setFont] = useState("serif");
  const [fontSize, setFontSize] = useState(12);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [marginH, setMarginH] = useState(20); // mm
  const [marginV, setMarginV] = useState(25); // mm

  const activePage = PAGE_SIZES.find((p) => p.value === pageSize) ?? PAGE_SIZES[1];
  const activeFont = FONTS.find((f) => f.value === font) ?? FONTS[0];

  // Build all chapter contents for the preview
  // allContent removed — no longer needed

  const previewText = content || "(Selecciona un capítulo para ver la vista previa)";
  const activeChapter = chapters.find((c) => c.id === activeId);

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

  // Scale handled inside BookPagePreview

  return (
    <div className="flex h-[calc(100vh-260px)] min-h-[500px]">
      {/* ── Sidebar: chapters ── */}
      <div className="w-56 shrink-0 border-r border-border bg-muted/30">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Capítulos</h3>
        </div>
        <ScrollArea className="h-[calc(100%-48px)]">
          <div className="p-2 space-y-0.5">
            {chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => selectChapter(ch.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  ch.id === activeId
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ── Page preview ── */}
      <div className="flex-1 bg-muted/20 overflow-hidden">
        <BookPagePreview
          title={activeChapter?.title}
          text={previewText}
          pageW={activePage.w}
          pageH={activePage.h}
          marginH={marginH}
          marginV={marginV}
          fontFamily={activeFont.css}
          fontSize={fontSize}
          lineHeight={lineHeight}
        />
      </div>

      {/* ── Settings panel ── */}
      <div className="w-72 shrink-0 border-l border-border bg-muted/30 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Configuración</h3>
        </div>

        <div className="p-4 space-y-6">
          {/* Page size */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Columns className="w-3.5 h-3.5" /> Tamaño de página
            </Label>
            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Font */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Type className="w-3.5 h-3.5" /> Tipografía
            </Label>
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    <span style={{ fontFamily: f.css }}>{f.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Font size */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <ALargeSmall className="w-3.5 h-3.5" /> Tamaño de fuente
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[fontSize]}
                onValueChange={([v]) => setFontSize(v)}
                min={8}
                max={18}
                step={0.5}
                className="flex-1"
              />
              <span className="text-sm text-foreground w-10 text-right tabular-nums">{fontSize}pt</span>
            </div>
          </div>

          {/* Line height */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <RulerIcon className="w-3.5 h-3.5" /> Interlineado
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[lineHeight]}
                onValueChange={([v]) => setLineHeight(v)}
                min={1.0}
                max={2.5}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm text-foreground w-10 text-right tabular-nums">{lineHeight.toFixed(1)}</span>
            </div>
          </div>

          <Separator />

          {/* Margins */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Margen horizontal
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[marginH]}
                onValueChange={([v]) => setMarginH(v)}
                min={10}
                max={40}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-foreground w-12 text-right tabular-nums">{marginH} mm</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Margen vertical
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[marginV]}
                onValueChange={([v]) => setMarginV(v)}
                min={10}
                max={40}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-foreground w-12 text-right tabular-nums">{marginV} mm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
