import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Chapter } from "@/hooks/useChapters";

export type SubchapterMode = "same-page" | "new-page";

interface Props {
  chapters: Chapter[];
  activeChapterId?: string;
  pageW: number;
  pageH: number;
  marginH: number;
  marginV: number;
  marginInner: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  subchapterMode: SubchapterMode;
}

const SECTION_ORDER: Record<string, number> = {
  dedicatoria: 0,
  prologo: 1,
  capitulo: 2,
  subcapitulo: 2.5,
  epilogo: 3,
  agradecimientos: 4,
  texto_libre: 5,
};

interface PageContent {
  elements: PageElement[];
  pageNumber: number;
}

type PageElement =
  | { type: "chapter-header"; chapterNum: number; title: string }
  | { type: "subchapter-header"; title: string }
  | { type: "section-header"; title: string; sectionType: string }
  | { type: "paragraph"; text: string; indent: boolean };

export default function BookPagePreview({
  chapters,
  activeChapterId,
  pageW,
  pageH,
  marginH,
  marginV,
  marginInner,
  fontFamily,
  fontSize,
  lineHeight,
  subchapterMode,
}: Props) {
  const scale = Math.min(520 / pageW, 1);
  const scaledW = pageW * scale;
  const scaledH = pageH * scale;
  const scaledMH = marginH * scale;
  const scaledMV = marginV * scale;
  const scaledMInner = marginInner * scale;
  const scaledFont = fontSize * scale * 0.28;
  const scaledTitleFont = (fontSize + 8) * scale * 0.28;
  const scaledSubtitleFont = (fontSize + 3) * scale * 0.28;
  const contentH = scaledH - scaledMV * 2;

  const [pages, setPages] = useState<PageContent[]>([]);

  // Build pages from chapters
  useEffect(() => {
    if (!chapters.length) {
      setPages([{
        elements: [{ type: "paragraph", text: "(Sin contenido)", indent: false }],
        pageNumber: 1,
      }]);
      return;
    }

    // Filter to active chapter if set, otherwise show all
    const chaptersToShow = activeChapterId
      ? chapters.filter((c) => c.id === activeChapterId)
      : chapters;

    if (!chaptersToShow.length) {
      setPages([{
        elements: [{ type: "paragraph", text: "(Selecciona un capítulo)", indent: false }],
        pageNumber: 1,
      }]);
      return;
    }

    const result: PageContent[] = [];
    let currentElements: PageElement[] = [];
    let usedHeight = 0;
    let pageNum = 1;

    const lineHeightPx = scaledFont * lineHeight;
    const avgContentW = scaledW - scaledMH - scaledMInner;
    const charsPerLine = Math.max(1, Math.floor(avgContentW / (scaledFont * 0.52)));

    const flushPage = () => {
      if (currentElements.length > 0) {
        result.push({ elements: currentElements, pageNumber: pageNum });
        pageNum++;
        currentElements = [];
        usedHeight = 0;
      }
    };

    const newPage = () => {
      flushPage();
    };

    const addElement = (el: PageElement, height: number) => {
      if (usedHeight + height > contentH && currentElements.length > 0) {
        flushPage();
      }
      currentElements.push(el);
      usedHeight += height;
    };

    let chapterCount = 0;

    for (const chapter of chaptersToShow) {
      const isChapter = chapter.section_type === "capitulo";
      const isSubchapter = chapter.section_type === "subcapitulo";

      if (isChapter) {
        chapterCount++;
        // Chapters always start on new page
        newPage();
        const headerHeight = scaledTitleFont * 1.4 + scaledFont * 1.2 + 24;
        addElement(
          { type: "chapter-header", chapterNum: chapterCount, title: chapter.title },
          headerHeight
        );
      } else if (isSubchapter) {
        if (subchapterMode === "new-page") {
          newPage();
        }
        const subHeight = scaledSubtitleFont * 1.4 + 12;
        addElement({ type: "subchapter-header", title: chapter.title }, subHeight);
      } else {
        // Other section types (dedicatoria, prologo, etc.) start on new page
        newPage();
        const headerHeight = scaledTitleFont * 1.4 + 16;
        addElement(
          { type: "section-header", title: chapter.title, sectionType: chapter.section_type },
          headerHeight
        );
      }

      // Add paragraphs
      const paragraphs = chapter.content.split("\n").filter((p) => p.trim() !== "");
      paragraphs.forEach((para, j) => {
        const lines = Math.max(1, Math.ceil(para.length / charsPerLine));
        const paraHeight = lines * lineHeightPx;
        const shouldIndent = isChapter || isSubchapter
          ? j > 0
          : j > 0;
        addElement({ type: "paragraph", text: para, indent: shouldIndent }, paraHeight);
      });
    }

    flushPage();
    setPages(result.length ? result : [{
      elements: [{ type: "paragraph", text: "(Sin contenido)", indent: false }],
      pageNumber: 1,
    }]);
  }, [chapters, activeChapterId, contentH, scaledW, scaledMH, scaledMInner, scaledFont, scaledTitleFont, scaledSubtitleFont, lineHeight, subchapterMode]);

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col items-center gap-12 py-12 px-6">
        {pages.map((page, i) => {
          const isRecto = page.pageNumber % 2 === 1; // odd = right page
          const paddingLeft = isRecto ? `${scaledMInner}px` : `${scaledMH}px`;
          const paddingRight = isRecto ? `${scaledMH}px` : `${scaledMInner}px`;

          return (
            <div key={i} className="relative" style={{ perspective: "1200px" }}>
              {/* Stacked edges */}
              <div
                className="absolute rounded-sm bg-muted/30"
                style={{ width: scaledW - 2, height: scaledH - 2, top: 6, left: 6 }}
              />
              <div
                className="absolute rounded-sm bg-muted/15"
                style={{ width: scaledW - 1, height: scaledH - 1, top: 3, left: 3 }}
              />

              {/* Page */}
              <div
                className="relative bg-white rounded-sm overflow-hidden"
                style={{
                  width: scaledW,
                  height: scaledH,
                  paddingTop: `${scaledMV}px`,
                  paddingBottom: `${scaledMV}px`,
                  paddingLeft,
                  paddingRight,
                  boxShadow:
                    "0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08), inset 0 0 0 0.5px rgba(0,0,0,0.08)",
                }}
              >
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
                    height: `calc(100% - ${scaledFont}px)`,
                  }}
                >
                  {page.elements.map((el, j) => {
                    if (el.type === "chapter-header") {
                      return (
                        <div key={j} style={{ textAlign: "center", marginBottom: `${scaledFont}px` }}>
                          <div
                            style={{
                              fontFamily,
                              fontSize: `${scaledFont * 0.85}px`,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              color: "#888",
                              marginBottom: `${scaledFont * 0.3}px`,
                            }}
                          >
                            Capítulo {el.chapterNum}
                          </div>
                          <div
                            style={{
                              fontFamily,
                              fontSize: `${scaledTitleFont}px`,
                              fontWeight: 600,
                              color: "#1a1a1a",
                              lineHeight: 1.3,
                            }}
                          >
                            {el.title}
                          </div>
                        </div>
                      );
                    }

                    if (el.type === "subchapter-header") {
                      return (
                        <div
                          key={j}
                          style={{
                            fontFamily,
                            fontSize: `${scaledSubtitleFont}px`,
                            fontWeight: 700,
                            color: "#1a1a1a",
                            textAlign: "left",
                            marginTop: `${scaledFont * 1.2}px`,
                            marginBottom: `${scaledFont * 0.5}px`,
                          }}
                        >
                          {el.title}
                        </div>
                      );
                    }

                    if (el.type === "section-header") {
                      const labels: Record<string, string> = {
                        dedicatoria: "Dedicatoria",
                        prologo: "Prólogo",
                        epilogo: "Epílogo",
                        agradecimientos: "Agradecimientos",
                        texto_libre: "",
                      };
                      return (
                        <div key={j} style={{ textAlign: "center", marginBottom: `${scaledFont}px` }}>
                          {labels[el.sectionType] && (
                            <div
                              style={{
                                fontFamily,
                                fontSize: `${scaledFont * 0.85}px`,
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                color: "#888",
                                marginBottom: `${scaledFont * 0.3}px`,
                              }}
                            >
                              {labels[el.sectionType]}
                            </div>
                          )}
                          <div
                            style={{
                              fontFamily,
                              fontSize: `${scaledTitleFont}px`,
                              fontWeight: 600,
                              color: "#1a1a1a",
                              lineHeight: 1.3,
                            }}
                          >
                            {el.title}
                          </div>
                        </div>
                      );
                    }

                    // Paragraph
                    return (
                      <p
                        key={j}
                        style={{
                          margin: 0,
                          textIndent: el.indent ? `${scaledFont * 1.5}px` : "0",
                        }}
                      >
                        {el.text}
                      </p>
                    );
                  })}
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
                  {page.pageNumber}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
