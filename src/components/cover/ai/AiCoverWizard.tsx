import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import BriefingForm from "./BriefingForm";
import PromptEditor from "./PromptEditor";
import ProposalsGrid, { buildMockProposals, MockProposal } from "./ProposalsGrid";
import { buildCoverPrompt, CoverBriefing, EMPTY_BRIEFING } from "@/lib/cover/buildPrompt";

interface Props {
  initialTitle: string;
  initialSubtitle: string;
  initialAuthor: string;
  /** Se invoca cuando el usuario confirma una propuesta como portada. */
  onApplyImage: (dataUrl: string) => void;
}

const STEPS = ["Briefing", "Prompt", "Propuestas", "Selección"] as const;

export default function AiCoverWizard({ initialTitle, initialSubtitle, initialAuthor, onApplyImage }: Props) {
  const [step, setStep] = useState(0);
  const [briefing, setBriefing] = useState<CoverBriefing>({
    ...EMPTY_BRIEFING,
    title: initialTitle,
    subtitle: initialSubtitle,
    author: initialAuthor,
  });
  const [prompt, setPrompt] = useState<string>("");
  const [proposals, setProposals] = useState<MockProposal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const goNext = () => {
    if (step === 0) {
      // Generar prompt al pasar del briefing
      setPrompt(buildCoverPrompt(briefing));
    }
    if (step === 1) {
      // Generar propuestas mock al pasar del prompt
      setProposals(buildMockProposals(prompt));
      setSelectedId(null);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const regeneratePrompt = () => setPrompt(buildCoverPrompt(briefing));

  const selectedProposal = useMemo(
    () => proposals.find((p) => p.id === selectedId) || null,
    [proposals, selectedId],
  );

  const handleApply = () => {
    if (!selectedProposal) return;
    onApplyImage(selectedProposal.dataUrl);
    toast({ title: "Portada aplicada", description: "La propuesta seleccionada ya es tu portada actual." });
  };

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={label} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-md",
                  active && "bg-primary/10 text-primary",
                  done && "text-muted-foreground",
                  !active && !done && "text-muted-foreground/70",
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
                    active && "bg-primary text-primary-foreground",
                    done && "bg-muted text-foreground",
                    !active && !done && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <div>
        {step === 0 && <BriefingForm value={briefing} onChange={setBriefing} />}
        {step === 1 && <PromptEditor prompt={prompt} onChange={setPrompt} onRegenerate={regeneratePrompt} />}
        {step === 2 && (
          <ProposalsGrid proposals={proposals} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Selección</h4>
              <p className="text-xs text-muted-foreground">
                Confirma la propuesta para aplicarla como portada actual del libro.
              </p>
            </div>

            {selectedProposal ? (
              <div className="flex items-center gap-4 p-3 border border-border rounded-md bg-muted/20">
                <img
                  src={selectedProposal.dataUrl}
                  alt={selectedProposal.label}
                  className="w-20 h-30 object-cover rounded-sm border border-border"
                  style={{ aspectRatio: "2/3", height: "120px", width: "80px" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{selectedProposal.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Se guardará como imagen de fondo de la portada. Podrás seguir editando colores y textos en la pestaña Diseño.
                  </p>
                </div>
                <Button onClick={handleApply} className="gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Usar como portada
                </Button>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-md text-xs text-muted-foreground text-center">
                Vuelve al paso anterior y selecciona una propuesta para continuar.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={goBack} disabled={step === 0} className="gap-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Atrás
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            size="sm"
            onClick={goNext}
            disabled={step === 2 && !selectedId}
            className="gap-2"
          >
            Siguiente <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Paso final</span>
        )}
      </div>
    </div>
  );
}
