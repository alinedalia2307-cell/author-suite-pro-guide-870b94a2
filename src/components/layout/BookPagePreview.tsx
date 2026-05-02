import { useMemo } from "react";
import type { Chapter } from "@/hooks/useChapters";
import type { Footnote } from "@/hooks/useFootnotes";
import { FOOTNOTE_REGEX } from "@/hooks/useFootnotes";

export type SubchapterMode = "same-page" | "new-page";
export type ViewMode = "single" | "double";

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

export const SECTION_ORDER: Record<string, number> = {
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
  isBlank?: boolean;
}

type InlineSegment = { type: "text"; text: string } | { type: "fn"; n: number };

type PageElement =
  | { type: "chapter-header"; chapterNum: number; title: string }
  | { type: "subchapter-header"; title: string }
  | { type: "section-header"; title: string; sectionType: string }
  | { type: "paragraph"; segments: InlineSegment[]; indent: boolean }
  | { type: "footnotes-heading" }
  | { type: "footnote-item"; n: number; content: string };

const SECTION_LABELS: Record<string, string> = {
  dedicatoria: "Dedicatoria",
  prologo: "Prólogo",
  epilogo: "Epílogo",
  agradecimientos: "Agradecimientos",
  texto_libre: "",
};

export function sortChaptersForLayout(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    const oa = SECTION_ORDER[a.section_type] ?? 99;
    const ob = SECTION_ORDER[b.section_type] ?? 99;
    return oa - ob;
  });
}

export function resolveFootnoteGroupId(section: Chapter, currentChapterGroupId: string | null): string {
  if (section.section_type === "capitulo") return section.id;
  if (section.section_type === "subcapitulo") return currentChapterGroupId ?? section.id;
  return section.id;
}

function tokenize(text: string, numbering: Map<string, number>): InlineSegment[] {
  const re = new RegExp(FOOTNOTE_REGEX.source, "g");
  const out: InlineSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    const n = numbering.get(m[1]);
    if (n !== undefined) out.push({ type: "fn", n });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

export function buildPages(
  chapters: Chapter[],
  opts: {
    pageW: number; pageH: number; marginH: number; marginV: number; marginInner: number;
    fontSize: number; lineHeight: number; subchapterMode: SubchapterMode; insertBlankPages: boolean;
    scale: number;
    footnotes?: Footnote[];
  }
): PageContent[] {
  if (!chapters.length) {
    return [{ elements: [{ type: "paragraph", segments: [{ type: "text", text: "(Sin contenido)" }], indent: false }], pageNumber: 1 }];
  }

  const { pageW, pageH, marginH, marginV, marginInner, fontSize, lineHeight, subchapterMode, insertBlankPages, scale } = opts;
  const allFootnotes = opts.footnotes ?? [];

  const scaledMV = marginV * scale;
  const scaledMH = marginH * scale;
  const scaledMInner = marginInner * scale;
  const scaledFont = fontSize * scale * 0.28;
  const scaledTitleFont = (fontSize + 8) * scale * 0.28;
  const scaledSubtitleFont = (fontSize + 3) * scale * 0.28;
  const scaledFootnoteFont = (fontSize - 2) * scale * 0.28;
  const scaledW = pageW * scale;
  const scaledH = pageH * scale;
  const contentH = scaledH - scaledMV * 2;

  const sorted = sortChaptersForLayout(chapters);

  const result: PageContent[] = [];
  let currentElements: PageElement[] = [];
  let usedHeight = 0;
  let pageNum = 1;

  const lineHeightPx = scaledFont * lineHeight;
  const footnoteLineHeightPx = scaledFootnoteFont * 1.4;
  const avgContentW = scaledW - scaledMH - scaledMInner;
  const charsPerLine = Math.max(1, Math.floor(avgContentW / (scaledFont * 0.52)));
  const fnCharsPerLine = Math.max(1, Math.floor(avgContentW / (scaledFootnoteFont * 0.52)));

  const flushPage = () => {
    if (currentElements.length > 0) {
      result.push({ elements: currentElements, pageNumber: pageNum });
      pageNum++;
      currentElements = [];
      usedHeight = 0;
    }
  };

  const newPage = () => flushPage();

  const addBlankPage = () => {
    result.push({ elements: [], pageNumber: pageNum, isBlank: true });
    pageNum++;
  };

  const addElement = (el: PageElement, height: number) => {
    if (usedHeight + height > contentH && currentElements.length > 0) {
      flushPage();
    }
    currentElements.push(el);
    usedHeight += height;
  };

  let chapterCount = 0;
  let footnoteCounter = 0;
  // Pending footnotes accumulated within the current chapter (rendered at chapter end)
  let pendingChapterFns: { n: number; content: string }[] = [];
  let currentChapterGroupId: string | null = null;
  let activeFootnoteGroupId: string | null = null;

  const flushChapterFootnotes = () => {
    if (!pendingChapterFns.length) return;
    // Heading
    const headingH = scaledSubtitleFont * 1.5 + scaledFont * 0.6;
    addElement({ type: "footnotes-heading" }, headingH);
    for (const f of pendingChapterFns) {
      const text = `${f.n}. ${f.content || "(sin contenido)"}`;
      const lines = Math.max(1, Math.ceil(text.length / fnCharsPerLine));
      const h = lines * footnoteLineHeightPx + scaledFootnoteFont * 0.3;
      addElement({ type: "footnote-item", n: f.n, content: f.content }, h);
    }
    pendingChapterFns = [];
  };

  for (let ci = 0; ci < sorted.length; ci++) {
    const chapter = sorted[ci];
    const isChapter = chapter.section_type === "capitulo";
    const isSubchapter = chapter.section_type === "subcapitulo";

    if (isChapter) currentChapterGroupId = chapter.id;
    else if (!isSubchapter) currentChapterGroupId = null;

    const footnoteGroupId = resolveFootnoteGroupId(chapter, currentChapterGroupId);

    if (activeFootnoteGroupId !== null && footnoteGroupId !== activeFootnoteGroupId) {
      flushChapterFootnotes();
      footnoteCounter = 0;
    }

    activeFootnoteGroupId = footnoteGroupId;

    const chapterFootnotes = allFootnotes.filter((f) => f.chapter_id === chapter.id);
    const numbering = new Map<string, number>();
    const re = new RegExp(FOOTNOTE_REGEX.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(chapter.content)) !== null) {
      if (!numbering.has(m[1])) {
        footnoteCounter++;
        numbering.set(m[1], footnoteCounter);
      }
    }

    if (isChapter) {
      chapterCount++;
      newPage();
      if (insertBlankPages && result.length > 0 && pageNum % 2 === 0) addBlankPage();
      const headerHeight = scaledTitleFont * 1.4 + scaledFont * 1.2 + 24;
      addElement({ type: "chapter-header", chapterNum: chapterCount, title: chapter.title }, headerHeight);
    } else if (isSubchapter) {
      if (subchapterMode === "new-page") newPage();
      const subHeight = scaledSubtitleFont * 1.4 + 12;
      addElement({ type: "subchapter-header", title: chapter.title }, subHeight);
    } else {
      newPage();
      if (insertBlankPages && result.length > 0 && pageNum % 2 === 0) addBlankPage();
      const headerHeight = scaledTitleFont * 1.4 + 16;
      addElement({ type: "section-header", title: chapter.title, sectionType: chapter.section_type }, headerHeight);
    }

    const paragraphs = chapter.content.split("\n").filter((p) => p.trim() !== "");
    paragraphs.forEach((para, j) => {
      const segments = tokenize(para, numbering);
      const plainLen = segments.reduce((acc, s) => acc + (s.type === "text" ? s.text.length : 2), 0);
      const lines = Math.max(1, Math.ceil(plainLen / charsPerLine));
      const paraHeight = lines * lineHeightPx;
      for (const seg of segments) {
        if (seg.type === "fn") {
          const marker = [...numbering.entries()].find(([, v]) => v === seg.n)?.[0];
          const fn = chapterFootnotes.find((f) => f.marker === marker);
          if (fn && !pendingChapterFns.some((p) => p.n === seg.n)) {
            pendingChapterFns.push({ n: seg.n, content: fn.content });
          }
        }
      }
      addElement({ type: "paragraph", segments, indent: j > 0 }, paraHeight);
    });
  }

  // Flush footnotes of the very last chapter
  flushChapterFootnotes();
  flushPage();
  return result.length ? result : [{ elements: [{ type: "paragraph", segments: [{ type: "text", text: "(Sin contenido)" }], indent: false }], pageNumber: 1 }];
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
