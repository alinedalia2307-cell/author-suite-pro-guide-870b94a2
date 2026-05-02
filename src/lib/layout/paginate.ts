/**
 * Shared layout pagination engine.
 *
 * This module is the single source of truth for how a book is paginated in
 * the formatting phase. Both the on-screen preview (`BookPagePreview`) and
 * the PDF exporter (`LayoutPanel`) import from here so that page counts and
 * chapter/footnote ordering stay in sync.
 *
 * NOTE: Footnotes are currently grouped at the END of each chapter (modern
 * novel convention). True per-page footnotes are deferred to a future phase.
 */

import type { Chapter } from "@/hooks/useChapters";
import type { Footnote } from "@/hooks/useFootnotes";
import { FOOTNOTE_REGEX } from "@/hooks/useFootnotes";

export type SubchapterMode = "same-page" | "new-page";
export type ViewMode = "single" | "double";

export const SECTION_ORDER: Record<string, number> = {
  dedicatoria: 0,
  prologo: 1,
  capitulo: 2,
  subcapitulo: 2.5,
  epilogo: 3,
  agradecimientos: 4,
  texto_libre: 5,
};

export const SECTION_LABELS: Record<string, string> = {
  dedicatoria: "Dedicatoria",
  prologo: "Prólogo",
  epilogo: "Epílogo",
  agradecimientos: "Agradecimientos",
  texto_libre: "",
};

export type InlineSegment = { type: "text"; text: string } | { type: "fn"; n: number };

export type PageElement =
  | { type: "chapter-header"; chapterNum: number; title: string }
  | { type: "subchapter-header"; title: string }
  | { type: "section-header"; title: string; sectionType: string }
  | { type: "paragraph"; segments: InlineSegment[]; indent: boolean }
  | { type: "footnotes-heading" }
  | { type: "footnote-item"; n: number; content: string };

export interface PageContent {
  elements: PageElement[];
  pageNumber: number;
  isBlank?: boolean;
}

export interface BuildPagesOptions {
  pageW: number;
  pageH: number;
  marginH: number;
  marginV: number;
  marginInner: number;
  fontSize: number;
  lineHeight: number;
  subchapterMode: SubchapterMode;
  insertBlankPages: boolean;
  scale: number;
  footnotes?: Footnote[];
}

/** Sort chapters in the order they should appear in the laid-out book. */
export function sortChaptersForLayout(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    const oa = SECTION_ORDER[a.section_type] ?? 99;
    const ob = SECTION_ORDER[b.section_type] ?? 99;
    return oa - ob;
  });
}

/**
 * Resolve which "footnote group" a section belongs to. Subchapters share
 * the parent chapter's group; everything else is its own group.
 */
export function resolveFootnoteGroupId(
  section: Chapter,
  currentChapterGroupId: string | null
): string {
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

/**
 * Build the list of laid-out pages for a book. Pure function; identical input
 * yields identical output. Both the preview component and the PDF exporter
 * call this so the page count never diverges.
 */
export function buildPages(chapters: Chapter[], opts: BuildPagesOptions): PageContent[] {
  if (!chapters.length) {
    return [
      {
        elements: [
          { type: "paragraph", segments: [{ type: "text", text: "(Sin contenido)" }], indent: false },
        ],
        pageNumber: 1,
      },
    ];
  }

  const {
    pageW, pageH, marginH, marginV, marginInner,
    fontSize, lineHeight, subchapterMode, insertBlankPages, scale,
  } = opts;
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
  return result.length
    ? result
    : [
        {
          elements: [
            { type: "paragraph", segments: [{ type: "text", text: "(Sin contenido)" }], indent: false },
          ],
          pageNumber: 1,
        },
      ];
}
