import { useMemo } from "react";
import type { Chapter } from "@/hooks/useChapters";
import type { Footnote } from "@/hooks/useFootnotes";
// Pagination logic lives in the shared engine so the preview and the PDF
// exporter stay aligned. See src/lib/layout/paginate.ts.
import {
  buildPages,
  SECTION_LABELS,
  type InlineSegment,
  type PageContent,
  type SubchapterMode,
  type ViewMode,
} from "@/lib/layout/paginate";

// Re-exports for backward compatibility with existing imports.
export { buildPages, sortChaptersForLayout, resolveFootnoteGroupId, SECTION_ORDER } from "@/lib/layout/paginate";
export type { SubchapterMode, ViewMode, PageContent, PageElement, InlineSegment } from "@/lib/layout/paginate";

interface Props {
  chapters: Chapter[];
  footnotes?: Footnote[];
  pageW: number;
  pageH: number;
  marginH: number;
  marginV: number;
  marginInner: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  subchapterMode: SubchapterMode;
  viewMode: ViewMode;
  insertBlankPages: boolean;
  scale: number;
}

export default function BookPagePreview({
  chapters, footnotes = [], pageW, pageH, marginH, marginV, marginInner,
  fontFamily, fontSize, lineHeight, subchapterMode, viewMode,
  insertBlankPages, scale,
}: Props) {
  const scaledW = pageW * scale;
  const scaledH = pageH * scale;
  const scaledMH = marginH * scale;
  const scaledMV = marginV * scale;
  const scaledMInner = marginInner * scale;
  const scaledFont = fontSize * scale * 0.28;
  const scaledTitleFont = (fontSize + 8) * scale * 0.28;
  const scaledSubtitleFont = (fontSize + 3) * scale * 0.28;
  const scaledFootnoteFont = (fontSize - 2) * scale * 0.28;

  const pages = useMemo(
    () => buildPages(chapters, { pageW, pageH, marginH, marginV, marginInner, fontSize, lineHeight, subchapterMode, insertBlankPages, scale, footnotes }),
    [chapters, footnotes, pageW, pageH, marginH, marginV, marginInner, fontSize, lineHeight, subchapterMode, insertBlankPages, scale]
  );

  const renderSegments = (segments: InlineSegment[]) =>
    segments.map((s, i) =>
      s.type === "text" ? (
        <span key={i}>{s.text}</span>
      ) : (
        <sup key={i} style={{ fontSize: "0.7em", color: "#444", marginLeft: "1px" }}>{s.n}</sup>
      )
    );

  const renderPage = (page: PageContent, idx: number) => {
    const isRecto = page.pageNumber % 2 === 1;
    const paddingLeft = isRecto ? `${scaledMInner}px` : `${scaledMH}px`;
    const paddingRight = isRecto ? `${scaledMH}px` : `${scaledMInner}px`;

    return (
      <div
        key={idx}
        className="relative shrink-0"
        style={{
          width: scaledW,
          height: scaledH,
          backgroundColor: "white",
          boxShadow: viewMode === "single"
            ? "0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.10), inset 0 0 0 0.5px rgba(0,0,0,0.08)"
            : "none",
          borderRadius: viewMode === "single" ? "2px" : "0",
        }}
      >
        {page.isBlank ? (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ fontFamily, fontSize: `${scaledFont * 0.8}px`, color: "#ccc", fontStyle: "italic" }}>
              Página en blanco
            </span>
          </div>
        ) : (
          <>
            <div
              style={{
                position: "absolute",
                top: `${scaledMV}px`,
                bottom: `${scaledMV + scaledFont}px`,
                left: paddingLeft,
                right: paddingRight,
                fontFamily,
                fontSize: `${scaledFont}px`,
                lineHeight,
                color: "#333",
                textAlign: "justify",
                hyphens: "auto" as const,
                wordBreak: "break-word" as const,
                overflow: "hidden",
              }}
            >
              {page.elements.map((el, j) => {
                if (el.type === "chapter-header") {
                  return (
                    <div key={j} style={{ textAlign: "center", marginBottom: `${scaledFont}px`, paddingTop: `${scaledFont * 2}px` }}>
                      <div style={{ fontFamily, fontSize: `${scaledFont * 0.85}px`, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "#888", marginBottom: `${scaledFont * 0.3}px` }}>
                        Capítulo {el.chapterNum}
                      </div>
                      <div style={{ fontFamily, fontSize: `${scaledTitleFont}px`, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3 }}>
                        {el.title}
                      </div>
                    </div>
                  );
                }
                if (el.type === "subchapter-header") {
                  return (
                    <div key={j} style={{ fontFamily, fontSize: `${scaledSubtitleFont}px`, fontWeight: 700, color: "#1a1a1a", textAlign: "left", marginTop: `${scaledFont * 1.2}px`, marginBottom: `${scaledFont * 0.5}px` }}>
                      {el.title}
                    </div>
                  );
                }
                if (el.type === "section-header") {
                  return (
                    <div key={j} style={{ textAlign: "center", marginBottom: `${scaledFont}px`, paddingTop: `${scaledFont * 2}px` }}>
                      {SECTION_LABELS[el.sectionType] && (
                        <div style={{ fontFamily, fontSize: `${scaledFont * 0.85}px`, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "#888", marginBottom: `${scaledFont * 0.3}px` }}>
                          {SECTION_LABELS[el.sectionType]}
                        </div>
                      )}
                      <div style={{ fontFamily, fontSize: `${scaledTitleFont}px`, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3 }}>
                        {el.title}
                      </div>
                    </div>
                  );
                }
                if (el.type === "footnotes-heading") {
                  return (
                    <div key={j} style={{ marginTop: `${scaledFont * 1.2}px`, marginBottom: `${scaledFont * 0.4}px` }}>
                      <div style={{ width: "30%", borderTop: "1px solid #888", marginBottom: `${scaledFont * 0.4}px` }} />
                      <div style={{ fontFamily, fontSize: `${scaledFootnoteFont * 1.05}px`, fontWeight: 600, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                        Notas
                      </div>
                    </div>
                  );
                }
                if (el.type === "footnote-item") {
                  return (
                    <div key={j} style={{ fontFamily, fontSize: `${scaledFootnoteFont}px`, lineHeight: 1.4, color: "#444", display: "flex", gap: "4px", marginBottom: `${scaledFootnoteFont * 0.3}px`, textAlign: "left" }}>
                      <sup style={{ fontWeight: 600 }}>{el.n}</sup>
                      <span style={{ flex: 1 }}>{el.content || <em style={{ color: "#aaa" }}>(sin contenido)</em>}</span>
                    </div>
                  );
                }
                return (
                  <p key={j} style={{ margin: 0, textIndent: el.indent ? `${scaledFont * 1.5}px` : "0" }}>
                    {renderSegments(el.segments)}
                  </p>
                );
              })}
            </div>

            {/* Page number */}
            <span
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                textAlign: "center",
                fontFamily,
                fontSize: `${scaledFont * 0.75}px`,
                color: "#aaa",
                paddingBottom: `${scaledMV * 0.4}px`,
                letterSpacing: "0.05em",
              }}
            >
              {page.pageNumber}
            </span>
          </>
        )}
      </div>
    );
  };

  if (viewMode === "double") {
    const pairs: [PageContent | null, PageContent | null][] = [];
    let i = 0;
    if (pages.length > 0) {
      pairs.push([null, pages[0]]);
      i = 1;
    }
    while (i < pages.length) {
      pairs.push([pages[i] ?? null, pages[i + 1] ?? null]);
      i += 2;
    }

    return (
      <div className="flex flex-col items-center gap-16 py-12 px-4">
        {pairs.map(([left, right], pairIdx) => (
          <div key={pairIdx} className="flex" style={{ gap: 0 }}>
            <div
              style={{
                width: scaledW, height: scaledH,
                backgroundColor: left ? "white" : "#f5f5f0",
                boxShadow: "inset -1px 0 3px rgba(0,0,0,0.08)",
                borderRadius: "4px 0 0 4px", overflow: "hidden", position: "relative",
              }}
            >
              {left ? renderPage(left, pairIdx * 2) : <div className="w-full h-full" />}
              <div style={{ position: "absolute", top: 0, right: 0, width: "8px", height: "100%", background: "linear-gradient(to left, rgba(0,0,0,0.06), transparent)" }} />
            </div>
            <div style={{ width: "2px", backgroundColor: "#d4d0c8", boxShadow: "0 0 6px rgba(0,0,0,0.1)" }} />
            <div
              style={{
                width: scaledW, height: scaledH,
                backgroundColor: right ? "white" : "#f5f5f0",
                boxShadow: "inset 1px 0 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.12)",
                borderRadius: "0 4px 4px 0", overflow: "hidden", position: "relative",
              }}
            >
              {right ? renderPage(right, pairIdx * 2 + 1) : <div className="w-full h-full" />}
              <div style={{ position: "absolute", top: 0, left: 0, width: "8px", height: "100%", background: "linear-gradient(to right, rgba(0,0,0,0.06), transparent)" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-12 py-12 px-4">
      {pages.map((page, i) => renderPage(page, i))}
    </div>
  );
}
