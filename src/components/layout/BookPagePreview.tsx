import { useRef, useEffect, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  title?: string;
  text: string;
  pageW: number;
  pageH: number;
  marginH: number;
  marginV: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

export default function BookPagePreview({
  title,
  text,
  pageW,
  pageH,
  marginH,
  marginV,
  fontFamily,
  fontSize,
  lineHeight,
}: Props) {
  // Scale to fit ~520px width
  const scale = Math.min(520 / pageW, 1);
  const scaledW = pageW * scale;
  const scaledH = pageH * scale;
  const scaledMH = marginH * scale;
  const scaledMV = marginV * scale;
  const scaledFont = fontSize * scale * 0.28;
  const scaledTitleFont = (fontSize + 8) * scale * 0.28;
  const contentW = scaledW - scaledMH * 2;
  const contentH = scaledH - scaledMV * 2;

  const measRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);

  // Split text into pages based on available height
  useEffect(() => {
    if (!measRef.current) return;

    const container = measRef.current;
    const paragraphs = text.split("\n").filter((p) => p.trim() !== "");
    if (!paragraphs.length) {
      setPages(["(Sin contenido)"]);
      return;
    }

    const result: string[] = [];
    let currentPage: string[] = [];
    let usedHeight = 0;

    // If there's a title, account for it on page 1
    const titleHeight = title ? scaledTitleFont * 1.4 + 16 : 0;
    let availableHeight = contentH - (title ? titleHeight : 0);

    // Approximate line height in px
    const lineHeightPx = scaledFont * lineHeight;
    const charsPerLine = Math.max(1, Math.floor(contentW / (scaledFont * 0.52)));

    for (const para of paragraphs) {
      const lines = Math.max(1, Math.ceil(para.length / charsPerLine));
      const paraHeight = lines * lineHeightPx + scaledFont * 0.6; // + paragraph spacing

      if (usedHeight + paraHeight > availableHeight && currentPage.length > 0) {
        result.push(currentPage.join("\n\n"));
        currentPage = [];
        usedHeight = 0;
        availableHeight = contentH; // no title on subsequent pages
      }

      currentPage.push(para);
      usedHeight += paraHeight;
    }

    if (currentPage.length > 0) {
      result.push(currentPage.join("\n\n"));
    }

    setPages(result.length ? result : ["(Sin contenido)"]);
  }, [text, contentH, contentW, scaledFont, scaledTitleFont, lineHeight, title]);

  return (
    <ScrollArea className="h-full w-full">
      {/* Hidden measurement container */}
      <div ref={measRef} className="absolute opacity-0 pointer-events-none" />

      <div className="flex flex-col items-center gap-12 py-12 px-6">
        {pages.map((pageText, i) => (
          <div key={i} className="relative" style={{ perspective: "1200px" }}>
            {/* Stacked page edges for book depth */}
            <div
              className="absolute rounded-sm bg-muted/30"
              style={{
                width: scaledW - 2,
                height: scaledH - 2,
                top: 6,
                left: 6,
              }}
            />
            <div
              className="absolute rounded-sm bg-muted/15"
              style={{
                width: scaledW - 1,
                height: scaledH - 1,
                top: 3,
                left: 3,
              }}
            />

            {/* Actual page */}
            <div
              className="relative bg-white rounded-sm overflow-hidden"
              style={{
                width: scaledW,
                height: scaledH,
                padding: `${scaledMV}px ${scaledMH}px`,
                boxShadow:
                  "0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08), inset 0 0 0 0.5px rgba(0,0,0,0.08)",
              }}
            >
              {/* Chapter title on first page */}
              {i === 0 && title && (
                <h2
                  className="mb-4"
                  style={{
                    fontFamily,
                    fontSize: `${scaledTitleFont}px`,
                    lineHeight: 1.3,
                    color: "#1a1a1a",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    textAlign: "center",
                  }}
                >
                  {title}
                </h2>
              )}

              {/* Text content */}
              <div
                style={{
                  fontFamily,
                  fontSize: `${scaledFont}px`,
                  lineHeight,
                  color: "#333",
                  textAlign: "justify",
                  hyphens: "auto",
                  wordBreak: "break-word",
                  overflow: "hidden",
                  letterSpacing: "0.01em",
                  height: i === 0 && title
                    ? `calc(100% - ${scaledTitleFont * 1.4 + 16}px)`
                    : "100%",
                }}
              >
                {pageText.split("\n\n").map((para, j) => (
                  <p
                    key={j}
                    style={{
                      margin: 0,
                      marginBottom: `${scaledFont * 0.6}px`,
                      textIndent: j > 0 || (i > 0 && j === 0) ? `${scaledFont * 1.5}px` : "0",
                    }}
                  >
                    {para}
                  </p>
                ))}
              </div>

              {/* Page number */}
              <span
                className="absolute bottom-0 left-0 right-0 text-center"
                style={{
                  fontFamily,
                  fontSize: `${scaledFont * 0.75}px`,
                  color: "#aaa",
                  paddingBottom: `${scaledMV * 0.4}px`,
                  letterSpacing: "0.05em",
                }}
              >
                {i + 1}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
