import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface ToolPagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function ToolPagePlaceholder({ icon: Icon, title, description }: ToolPagePlaceholderProps) {
  const navigate = useNavigate();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gold/15 text-gold flex items-center justify-center mb-6">
        <Icon className="w-8 h-8" />
      </div>
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md mb-8">{description}</p>
      <Button variant="gold-outline" onClick={() => navigate("/")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver al inicio
      </Button>
    </main>
  );
}
