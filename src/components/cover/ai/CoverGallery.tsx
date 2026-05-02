import { ImageIcon } from "lucide-react";

export default function CoverGallery() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 border border-dashed border-border rounded-md bg-muted/20">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <ImageIcon className="w-5 h-5 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">Tu galería está vacía</h4>
      <p className="text-xs text-muted-foreground max-w-xs">
        Aquí aparecerán tus portadas generadas cuando conectes la IA.
      </p>
    </div>
  );
}
