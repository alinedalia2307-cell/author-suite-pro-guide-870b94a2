import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MockProposal {
  id: string;
  dataUrl: string;
  label: string;
}

interface Props {
  proposals: MockProposal[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Genera un SVG decorativo en data URL. Sirve como placeholder visual hasta
 * que se conecte la generación real de imágenes (Fase C).
 */
export function buildMockProposal(id: string, seed: number, label: string): MockProposal {
  // Paletas pensadas para que las 4 propuestas se vean distintas entre sí.
  const palettes = [
    ["#1a1a2e", "#e94560"],
    ["#16213e", "#f5d76e"],
    ["#2d1b3d", "#9b8cff"],
    ["#1b4332", "#52b788"],
    ["#7f2d2d", "#dc8850"],
    ["#0d1b2a", "#778da9"],
  ];
  const [bg, accent] = palettes[seed % palettes.length];

  // Dos formas: un círculo y una banda diagonal, variando posición por seed.
  const cx = 200 + ((seed * 53) % 100) - 50;
  const cy = 220 + ((seed * 31) % 120) - 60;
  const r = 90 + ((seed * 17) % 40);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
  <defs>
    <linearGradient id="g${seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#g${seed})"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}" opacity="0.55"/>
  <rect x="-50" y="${380 + (seed % 4) * 18}" width="500" height="60" fill="${accent}" opacity="0.18" transform="rotate(-12 200 410)"/>
  <text x="200" y="540" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#ffffff" opacity="0.85">${label}</text>
</svg>`.trim();

  // Codificar como data URL (encodeURIComponent para evitar problemas con caracteres).
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return { id, dataUrl, label };
}

export function buildMockProposals(promptKey: string): MockProposal[] {
  // Hash trivial del prompt → semilla, para que cambiar el prompt cambie las propuestas.
  let h = 0;
  for (let i = 0; i < promptKey.length; i++) h = (h * 31 + promptKey.charCodeAt(i)) | 0;
  const base = Math.abs(h);
  return Array.from({ length: 4 }, (_, i) =>
    buildMockProposal(`mock-${base}-${i}`, base + i * 7, `Propuesta ${i + 1}`),
  );
}

export default function ProposalsGrid({ proposals, selectedId, onSelect }: Props) {
  const items = useMemo(() => proposals, [proposals]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">Propuestas</h4>
        <p className="text-xs text-muted-foreground">
          Vista previa con propuestas de ejemplo. La generación real con IA llegará en una próxima fase.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((p) => {
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={cn(
                "group relative overflow-hidden rounded-md border-2 transition-all aspect-[2/3] bg-muted",
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50",
              )}
            >
              <img src={p.dataUrl} alt={p.label} className="w-full h-full object-cover" />
              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-background/80 backdrop-blur-sm text-[11px] py-1 text-center text-foreground">
                {p.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
