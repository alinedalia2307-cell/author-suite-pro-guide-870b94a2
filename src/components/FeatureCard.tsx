import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  countLabel?: string;
  accentColor?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  count,
  countLabel,
  accentColor = false,
  className,
  onClick,
}: FeatureCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start p-6 rounded-xl bg-card border border-border shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 text-left w-full",
        className
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300",
          accentColor
            ? "bg-gold/15 text-gold group-hover:bg-gold/25"
            : "bg-muted text-muted-foreground group-hover:bg-gold/15 group-hover:text-gold"
        )}
      >
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-display text-lg font-semibold text-card-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      {count !== undefined && (
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-card-foreground">{count}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{countLabel}</span>
        </div>
      )}
    </button>
  );
}
