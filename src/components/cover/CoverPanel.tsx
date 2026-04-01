import { useState, useRef } from "react";
import { Type, Paintbrush, AlignLeft, AlignCenter, AlignRight, ImageIcon, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import CoverPreview, { CoverStyle, TextAlign } from "./CoverPreview";

interface Props {
  bookTitle: string;
  bookSubtitle: string | null;
  bookAuthor: string;
}

const COVER_STYLES: { value: CoverStyle; label: string }[] = [
  { value: "classic", label: "Clásico" },
  { value: "modern", label: "Moderno" },
  { value: "minimal", label: "Minimalista" },
  { value: "bold", label: "Impactante" },
  { value: "literary", label: "Literario" },
];

const PRESET_COLORS = [
  { bg: "#1a1a2e", accent: "#e94560" },
  { bg: "#16213e", accent: "#0f3460" },
  { bg: "#2d1b69", accent: "#8338ec" },
  { bg: "#1b4332", accent: "#52b788" },
  { bg: "#7f2d2d", accent: "#dc8850" },
  { bg: "#f5f0e8", accent: "#8b7355" },
  { bg: "#fefefe", accent: "#333333" },
  { bg: "#0d1b2a", accent: "#778da9" },
];

export default function CoverPanel({ bookTitle, bookSubtitle, bookAuthor }: Props) {
  const [title, setTitle] = useState(bookTitle);
  const [subtitle, setSubtitle] = useState(bookSubtitle || "");
  const [author, setAuthor] = useState(bookAuthor);
  const [style, setStyle] = useState<CoverStyle>("classic");
  const [textAlign, setTextAlign] = useState<TextAlign>("left");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [accentColor, setAccentColor] = useState("#e94560");
  const [useGradient, setUseGradient] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setBgImage(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex h-[calc(100vh-260px)] min-h-[500px]">
      {/* Preview */}
      <div className="flex-1 bg-muted/20 overflow-auto flex items-center justify-center">
        <CoverPreview
          title={title}
          subtitle={subtitle}
          author={author}
          style={style}
          textAlign={textAlign}
          bgColor={bgColor}
          accentColor={accentColor}
          bgImage={bgImage}
          useGradient={useGradient}
        />
      </div>

      {/* Settings */}
      <div className="w-80 shrink-0 border-l border-border bg-muted/30">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Diseño de portada</h3>
        </div>

        <ScrollArea className="h-[calc(100%-48px)]">
          <div className="p-4 space-y-5">
            {/* Text fields */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Type className="w-3.5 h-3.5" /> Textos
              </Label>
              <div className="space-y-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="h-9 text-sm" />
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtítulo (opcional)" className="h-9 text-sm" />
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Autor" className="h-9 text-sm" />
              </div>
            </div>

            <Separator />

            {/* Alignment */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alineación</Label>
              <ToggleGroup type="single" value={textAlign} onValueChange={(v) => v && setTextAlign(v as TextAlign)} className="justify-start">
                <ToggleGroupItem value="left" aria-label="Izquierda" className="h-8 w-8 p-0">
                  <AlignLeft className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" aria-label="Centro" className="h-8 w-8 p-0">
                  <AlignCenter className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" aria-label="Derecha" className="h-8 w-8 p-0">
                  <AlignRight className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Separator />

            {/* Style */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Paintbrush className="w-3.5 h-3.5" /> Estilo
              </Label>
              <Select value={style} onValueChange={(v) => setStyle(v as CoverStyle)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVER_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Colors */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colores</Label>

              {/* Presets */}
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => { setBgColor(preset.bg); setAccentColor(preset.accent); }}
                    className="h-8 rounded-md border border-border/60 overflow-hidden hover:ring-2 ring-primary/40 transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${preset.bg} 60%, ${preset.accent} 100%)`,
                    }}
                    title={`${preset.bg} / ${preset.accent}`}
                  />
                ))}
              </div>

              {/* Custom colors */}
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Fondo</span>
                  <div className="flex items-center gap-2">
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
                    <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-8 text-xs font-mono flex-1" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Acento</span>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
                    <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-8 text-xs font-mono flex-1" />
                  </div>
                </div>
              </div>

              {/* Gradient toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Degradado</span>
                <Switch checked={useGradient} onCheckedChange={setUseGradient} />
              </div>
            </div>

            <Separator />

            {/* Background image */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <ImageIcon className="w-3.5 h-3.5" /> Imagen de fondo
              </Label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

              {bgImage ? (
                <div className="space-y-2">
                  <div className="relative rounded-md overflow-hidden border border-border h-20">
                    <img src={bgImage} alt="Fondo" className="w-full h-full object-cover" />
                  </div>
                  <Button variant="outline" size="sm" onClick={removeImage} className="w-full text-xs">
                    Quitar imagen
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="w-full gap-2 text-xs"
                >
                  <Upload className="w-3.5 h-3.5" /> Subir imagen
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
