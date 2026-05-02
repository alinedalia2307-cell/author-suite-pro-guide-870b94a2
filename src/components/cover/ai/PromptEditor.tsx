import { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Props {
  prompt: string;
  onChange: (next: string) => void;
  onRegenerate: () => void;
}

export default function PromptEditor({ prompt, onChange, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast({ title: "Prompt copiado al portapapeles" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">Prompt generado</h4>
        <p className="text-xs text-muted-foreground">
          Lo hemos compuesto a partir de tu briefing. Puedes editarlo libremente antes de generar las propuestas.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Prompt</Label>
        <Textarea
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm min-h-[180px] font-mono leading-relaxed"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado" : "Copiar prompt"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onRegenerate} className="gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Regenerar desde briefing
        </Button>
      </div>
    </div>
  );
}
