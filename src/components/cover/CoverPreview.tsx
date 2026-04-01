import { useMemo } from "react";

export type CoverStyle = "classic" | "modern" | "minimal" | "bold" | "literary";
export type TextAlign = "left" | "center" | "right";

interface Props {
  title: string;
  subtitle: string;
  author: string;
  style: CoverStyle;
  textAlign: TextAlign;
  bgColor: string;
  accentColor: string;
  bgImage: string | null;
  useGradient: boolean;
}

const STYLE_CONFIG: Record<CoverStyle, {
  titleWeight: number;
  titleSize: string;
  subtitleSize: string;
  authorSize: string;
  titleTransform: string;
  spacing: string;
}> = {
  classic: { titleWeight: 700, titleSize: "2.2rem", subtitleSize: "1rem", authorSize: "0.95rem", titleTransform: "none", spacing: "normal" },
  modern: { titleWeight: 800, titleSize: "2.6rem", subtitleSize: "1.05rem", authorSize: "0.85rem", titleTransform: "none", spacing: "tight" },
  minimal: { titleWeight: 300, titleSize: "2rem", subtitleSize: "0.9rem", authorSize: "0.8rem", titleTransform: "uppercase", spacing: "wide" },
  bold: { titleWeight: 900, titleSize: "3rem", subtitleSize: "1.1rem", authorSize: "0.9rem", titleTransform: "uppercase", spacing: "normal" },
  literary: { titleWeight: 400, titleSize: "2.4rem", subtitleSize: "1rem", authorSize: "0.85rem", titleTransform: "none", spacing: "normal" },
};

function getLetterSpacing(spacing: string) {
  if (spacing === "wide") return "0.2em";
  if (spacing === "tight") return "-0.02em";
  return "0.02em";
}

function getTextColor(bgColor: string): string {
  // Simple luminance check for hex colors
  const hex = bgColor.replace("#", "");
  if (hex.length < 6) return "#ffffff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1a1a1a" : "#ffffff";
}

export default function CoverPreview({
  title,
  subtitle,
  author,
  style,
  textAlign,
  bgColor,
  accentColor,
  bgImage,
  useGradient,
}: Props) {
  const cfg = STYLE_CONFIG[style];
  const textColor = bgImage ? "#ffffff" : getTextColor(bgColor);
  const subtitleColor = bgImage ? "rgba(255,255,255,0.75)" : textColor === "#ffffff" ? "rgba(255,255,255,0.7)" : "rgba(26,26,26,0.6)";
  const authorColor = bgImage ? "rgba(255,255,255,0.85)" : textColor === "#ffffff" ? "rgba(255,255,255,0.8)" : "rgba(26,26,26,0.7)";
  const dividerColor = bgImage ? "rgba(255,255,255,0.3)" : textColor === "#ffffff" ? "rgba(255,255,255,0.2)" : "rgba(26,26,26,0.15)";

  const background = useMemo(() => {
    if (bgImage) return undefined;
    if (useGradient) {
      return `linear-gradient(160deg, ${bgColor} 0%, ${accentColor} 100%)`;
    }
    return bgColor;
  }, [bgImage, bgColor, accentColor, useGradient]);

  // Cover aspect ratio: ~6x9 (book standard)
  const coverW = 360;
  const coverH = 540;

  const fontFamily = style === "literary"
    ? "'Playfair Display', 'Georgia', serif"
    : style === "modern" || style === "bold"
      ? "'Source Sans 3', 'Helvetica Neue', sans-serif"
      : "'Georgia', 'Times New Roman', serif";

  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative" style={{ perspective: "1000px" }}>
        {/* Spine shadow */}
        <div
          className="absolute rounded-sm"
          style={{
            width: coverW - 4,
            height: coverH - 4,
            top: 8,
            left: 8,
            background: "rgba(0,0,0,0.15)",
            filter: "blur(12px)",
          }}
        />

        {/* Cover */}
        <div
          className="relative overflow-hidden"
          style={{
            width: coverW,
            height: coverH,
            background: background,
            borderRadius: "2px 8px 8px 2px",
            boxShadow: `
              0 2px 8px rgba(0,0,0,0.12),
              0 8px 24px rgba(0,0,0,0.15),
              0 24px 48px rgba(0,0,0,0.1),
              inset -2px 0 4px rgba(0,0,0,0.06),
              inset 3px 0 6px rgba(255,255,255,0.08)
            `,
          }}
        >
          {/* Background image */}
          {bgImage && (
            <>
              <img
                src={bgImage}
                alt="Fondo de portada"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.4) 100%)`,
                }}
              />
            </>
          )}

          {/* Spine edge effect */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[6px]"
            style={{
              background: "linear-gradient(90deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.04) 40%, transparent 100%)",
            }}
          />

          {/* Decorative accent line */}
          {(style === "classic" || style === "literary") && (
            <div
              className="absolute"
              style={{
                top: "15%",
                left: textAlign === "center" ? "20%" : textAlign === "left" ? "12%" : "auto",
                right: textAlign === "right" ? "12%" : "auto",
                width: textAlign === "center" ? "60%" : "40%",
                height: "1px",
                background: dividerColor,
              }}
            />
          )}

          {/* Content */}
          <div
            className="relative z-10 flex flex-col h-full"
            style={{
              padding: "48px 32px 40px 36px",
              textAlign,
              fontFamily,
            }}
          >
            {/* Top section: title + subtitle */}
            <div className="flex-1 flex flex-col" style={{ justifyContent: style === "bold" ? "center" : "flex-start", paddingTop: style === "bold" ? 0 : "20%" }}>
              <h1
                style={{
                  color: textColor,
                  fontSize: cfg.titleSize,
                  fontWeight: cfg.titleWeight,
                  lineHeight: 1.15,
                  letterSpacing: getLetterSpacing(cfg.spacing),
                  textTransform: cfg.titleTransform as any,
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {title || "Título del libro"}
              </h1>

              {subtitle && (
                <p
                  style={{
                    color: subtitleColor,
                    fontSize: cfg.subtitleSize,
                    fontWeight: 400,
                    lineHeight: 1.4,
                    marginTop: "12px",
                    letterSpacing: style === "minimal" ? "0.08em" : "0.01em",
                    fontStyle: style === "literary" ? "italic" : "normal",
                  }}
                >
                  {subtitle}
                </p>
              )}

              {/* Decorative divider below title for some styles */}
              {(style === "modern" || style === "bold") && (
                <div
                  style={{
                    width: textAlign === "center" ? "40px" : "48px",
                    height: "3px",
                    background: accentColor,
                    marginTop: "16px",
                    marginLeft: textAlign === "center" ? "auto" : textAlign === "right" ? "auto" : "0",
                    marginRight: textAlign === "center" ? "auto" : textAlign === "right" ? "0" : "auto",
                    borderRadius: "2px",
                  }}
                />
              )}
            </div>

            {/* Bottom: author */}
            <div>
              {style === "classic" && (
                <div style={{ width: "100%", height: "1px", background: dividerColor, marginBottom: "16px" }} />
              )}
              <p
                style={{
                  color: authorColor,
                  fontSize: cfg.authorSize,
                  fontWeight: style === "minimal" ? 300 : 500,
                  letterSpacing: style === "minimal" ? "0.15em" : "0.04em",
                  textTransform: style === "minimal" ? "uppercase" : "none",
                  margin: 0,
                }}
              >
                {author || "Nombre del autor"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
