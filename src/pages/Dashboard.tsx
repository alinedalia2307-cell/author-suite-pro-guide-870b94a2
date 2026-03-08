import { useNavigate } from "react-router-dom";
import { PenTool, LayoutGrid, BookOpen, BookImage, Languages, Upload, TrendingUp, FileText, Clock } from "lucide-react";
import FeatureCard from "@/components/FeatureCard";
import heroImg from "@/assets/hero-illustration.png";

const features = [
  { icon: PenTool, title: "Editor de Manuscritos", description: "Edita y corrige tu manuscrito con herramientas avanzadas de escritura.", to: "/editor", count: 3, countLabel: "en progreso" },
  { icon: LayoutGrid, title: "Organizar Libro", description: "Estructura capítulos, escenas y notas de tu obra.", to: "/organizar", count: 12, countLabel: "capítulos" },
  { icon: BookOpen, title: "Maquetación", description: "Da formato profesional a tu contenido para imprenta o digital.", to: "/maquetar", count: 1, countLabel: "plantilla activa" },
  { icon: BookImage, title: "Generar Portada", description: "Crea portadas atractivas con plantillas y herramientas de diseño.", to: "/portada", count: 5, countLabel: "diseños guardados" },
  { icon: Languages, title: "Traducción", description: "Traduce tu obra a múltiples idiomas de forma rápida.", to: "/traducir", count: 2, countLabel: "idiomas" },
  { icon: Upload, title: "Publicar", description: "Publica en Amazon, Apple Books, Google Play y más plataformas.", to: "/publicar", count: 0, countLabel: "publicados" },
];

const stats = [
  { icon: FileText, label: "Manuscritos", value: "3" },
  { icon: TrendingUp, label: "Palabras hoy", value: "1,247" },
  { icon: Clock, label: "Tiempo editando", value: "2h 15m" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="relative overflow-hidden bg-primary px-8 py-10">
        <div className="relative z-10 max-w-4xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
            Bienvenido a <span className="text-gradient-gold">Author Suite Pro</span>
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl">
            Tu estudio completo para escribir, organizar y publicar tu próximo libro.
          </p>
          <div className="flex flex-wrap gap-6 mt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 bg-ink-light/40 rounded-lg px-4 py-3 backdrop-blur-sm">
                <stat.icon className="w-5 h-5 text-gold" />
                <div>
                  <p className="text-xs text-primary-foreground/60 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-lg font-bold text-primary-foreground">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <img src={heroImg} alt="Author Suite illustration" className="absolute right-0 top-1/2 -translate-y-1/2 w-72 h-72 object-contain opacity-30 pointer-events-none select-none hidden lg:block" />
      </div>

      <div className="p-8">
        <h2 className="font-display text-xl font-semibold text-foreground mb-6">Herramientas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <div key={feat.to} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <FeatureCard
                icon={feat.icon}
                title={feat.title}
                description={feat.description}
                count={feat.count}
                countLabel={feat.countLabel}
                accentColor={i === 0}
                onClick={() => navigate(feat.to)}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
