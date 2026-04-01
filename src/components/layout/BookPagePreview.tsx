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

      <div className="flex flex-col items-center gap-8 py-8 px-4">
        {pages.map((pageText, i) => (
          <div key={i} className="relative">
            {/* Page shadow layers for depth */}
            <div
              className="absolute inset-0 translate-x-1 translate-y-1 bg-muted/40 rounded-sm"
              style={{ width: scaledW, height: scaledH }}
            />
            <div
              className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-muted/20 rounded-sm"
              style={{ width: scaledW, height: scaledH }}
            />

            {/* Actual page */}
            <div
              className="relative bg-white border border-border/60 rounded-sm overflow-hidden"
              style={{
                width: scaledW,
                height: scaledH,
                padding: `${scaledMV}px ${scaledMH}px`,
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
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
                  color: "#2a2a2a",
                  textAlign: "justify",
                  hyphens: "auto",
                  wordBreak: "break-word",
                  textIndent: `${scaledFont * 1.5}px`,
                  overflow: "hidden",
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
                      marginBottom: `${scaledFont * 0.5}px`,
                      textIndent: j > 0 ? `${scaledFont * 1.5}px` : "0",
                    }}
                  >
                    {para}
                  </p>
                ))}
              </div>

              {/* Page number */}
              <span
                className="absolute bottom-0 left-0 right-0 text-center pb-2"
                style={{
                  fontFamily,
                  fontSize: `${scaledFont * 0.8}px`,
                  color: "#999",
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
