import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CoverBriefing,
  GENRE_OPTIONS,
  TONE_OPTIONS,
  STYLE_OPTIONS,
  PALETTE_OPTIONS,
} from "@/lib/cover/buildPrompt";

interface Props {
  value: CoverBriefing;
  onChange: (next: CoverBriefing) => void;
}

export default function BriefingForm({ value, onChange }: Props) {
  const set = <K extends keyof CoverBriefing>(key: K, v: CoverBriefing[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">Briefing creativo</h4>
        <p className="text-xs text-muted-foreground">
          Cuéntale a la IA cómo imaginas la portada. Cuanto más específico, mejor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Título</Label>
          <Input value={value.title} onChange={(e) => set("title", e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Subtítulo</Label>
            <Input value={value.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Autor</Label>
            <Input value={value.author} onChange={(e) => set("author", e.target.value)} className="h-9 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Género</Label>
            <Select value={value.genre} onValueChange={(v) => set("genre", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Elige un género" /></SelectTrigger>
              <SelectContent>
                {GENRE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tono</Label>
            <Select value={value.tone} onValueChange={(v) => set("tone", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Elige un tono" /></SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Estilo visual</Label>
            <Select value={value.visualStyle} onValueChange={(v) => set("visualStyle", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Elige un estilo" /></SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Paleta de color</Label>
            <Select value={value.palette} onValueChange={(v) => set("palette", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Elige una paleta" /></SelectTrigger>
              <SelectContent>
                {PALETTE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Elementos deseados</Label>
          <Textarea
            value={value.elements}
            onChange={(e) => set("elements", e.target.value)}
            placeholder="Ej: una llave dorada flotando sobre un bosque brumoso al amanecer"
            className="text-sm min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
}
