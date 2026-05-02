// Construye un prompt creativo para generación de portadas a partir de un briefing.
// Pensado para alimentar más adelante a un modelo de imagen (Lovable AI, etc.).
// Por ahora se usa solo en la UI del Asistente IA (Fase A) — sin llamadas reales.

export interface CoverBriefing {
  title: string;
  subtitle: string;
  author: string;
  genre: string;
  tone: string;
  visualStyle: string;
  elements: string;
  palette: string;
}

export const EMPTY_BRIEFING: CoverBriefing = {
  title: "",
  subtitle: "",
  author: "",
  genre: "",
  tone: "",
  visualStyle: "",
  elements: "",
  palette: "",
};

export const GENRE_OPTIONS = [
  "Novela",
  "Ensayo",
  "Poesía",
  "Infantil",
  "Técnico",
  "Fantasía",
  "Ciencia ficción",
  "Romance",
  "Misterio / Thriller",
  "Histórico",
  "Biografía",
  "Autoayuda",
];

export const TONE_OPTIONS = [
  "Sobrio",
  "Intrigante",
  "Romántico",
  "Oscuro",
  "Luminoso",
  "Épico",
  "Melancólico",
  "Esperanzador",
  "Inquietante",
  "Juvenil",
];

export const STYLE_OPTIONS = [
  "Fotográfico realista",
  "Ilustración digital",
  "Acuarela",
  "Minimalista",
  "Vintage / retro",
  "3D moderno",
  "Tipográfico",
  "Pintura al óleo",
  "Collage",
  "Geométrico abstracto",
];

export const PALETTE_OPTIONS = [
  "Cálida (rojos, dorados, ocres)",
  "Fría (azules, verdes, grises)",
  "Monocromo blanco y negro",
  "Pastel suave",
  "Alto contraste",
  "Tierra y verdes",
  "Dorado y negro",
  "Azules profundos",
];

/**
 * Compone un prompt en inglés (formato típico de modelos de imagen) describiendo
 * una portada de libro. Omite los campos vacíos para no ensuciar el prompt.
 */
export function buildCoverPrompt(b: CoverBriefing): string {
  const parts: string[] = [];

  parts.push("Book cover artwork, 6x9 portrait aspect ratio, professional editorial design.");

  if (b.title) parts.push(`Book title: "${b.title}".`);
  if (b.subtitle) parts.push(`Subtitle: "${b.subtitle}".`);
  if (b.author) parts.push(`Author name: "${b.author}".`);

  if (b.genre) parts.push(`Genre: ${b.genre}.`);
  if (b.tone) parts.push(`Mood and tone: ${b.tone}.`);
  if (b.visualStyle) parts.push(`Visual style: ${b.visualStyle}.`);

  if (b.elements.trim()) {
    parts.push(`Key visual elements to include: ${b.elements.trim()}.`);
  }

  if (b.palette) parts.push(`Color palette: ${b.palette}.`);

  parts.push(
    "Strong focal composition, leave breathing room at the top for the title and at the bottom for the author. " +
      "High quality, suitable for print, no watermarks, no logos, no extra text beyond the requested title/subtitle/author.",
  );

  return parts.join(" ");
}
