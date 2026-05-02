/**
 * Parallel PDF renderer (Phase 2.1).
 *
 * Pure painter: receives PageContent[] from `paginate.ts` and draws each
 * element onto a jsPDF instance. It does NOT decide chapter order, page
 * breaks, chapter numbering, footnote numbering, footnote grouping, or
 * any duplicate-title filtering — all of that already lives in
 * `paginate.ts`. The renderer only paints what it is given.
 *
 * Currently behind a feature flag in `LayoutPanel`. The legacy exporter
 * stays the active one until this renderer is validated.
 */

import type jsPDF from "jspdf";
import type { PageContent } from "./paginate";
import { SECTION_LABELS } from "./paginate";

export interface RenderPdfOptions {
  pageW: number;
  pageH: number;
  marginH: number;
  marginV: number;
  marginInner: number;
  fontSize: number;
  lineHeight: number;
  /** jsPDF built-in family. Defaults to "helvetica". */
  fontFamily?: "helvetica" | "times" | "courier";
}

/**
 * Paint a list of pre-paginated pages into the given jsPDF document.
 *
 * @param pdf           jsPDF instance (already created with the right size)
 * @param pages         Pages produced by `buildPages()`
 * @param opts          Page geometry + base typography
 * @param startNewPage  If true, calls `pdf.addPage()` before the first page.
 *                      Use this when something was already drawn (e.g. cover).
 */
export function renderPagesToPdf(
  pdf: jsPDF,
  pages: PageContent[],
  opts: RenderPdfOptions,
  startNewPage = false,
): void {
  const {
    pageW, pageH, marginH, marginV, marginInner,
    fontSize, lineHeight,
  } = opts;
  const family = opts.fontFamily ?? "helvetica";

  const contentW = pageW - marginH - marginInner;
  const lineHeightMm = fontSize * 0.3528 * lineHeight;
  const fnFontSize = fontSize - 2;
  const fnLineHeightMm = fnFontSize * 0.3528 * 1.4;

  pages.forEach((page, idx) => {
    if (idx > 0 || startNewPage) pdf.addPage();

    // Blank page: nothing to paint (no number either, matches preview).
    if (page.isBlank) return;

    const isRecto = page.pageNumber % 2 === 1;
    const leftX = isRecto ? marginInner : marginH;
    let cursorY = marginV;

    for (const el of page.elements) {
      switch (el.type) {
        case "chapter-header": {
          // "CAPÍTULO N" label + title, both centered.
          cursorY = Math.max(cursorY, marginV + 20);
          pdf.setFont(family, "bold");
          pdf.setFontSize(10);
          pdf.setTextColor(136, 136, 136);
          pdf.text(`Capítulo ${el.chapterNum}`.toUpperCase(), pageW / 2, cursorY, { align: "center" });
          cursorY += 8;

          const title = (el.title || "").trim();
          const isPlainLabel = new RegExp(`^cap[ií]tulo\\s+${el.chapterNum}\\s*$`, "i").test(title);
          if (title && !isPlainLabel) {
            pdf.setFont(family, "bold");
            pdf.setFontSize(16);
            pdf.setTextColor(26, 26, 26);
            const titleLines = pdf.splitTextToSize(title, contentW);
            pdf.text(titleLines, pageW / 2, cursorY, { align: "center" });
            cursorY += titleLines.length * 7 + 6;
          } else {
            cursorY += 4;
          }
          break;
        }

        case "subchapter-header": {
          pdf.setFont(family, "bold");
          pdf.setFontSize(13);
          pdf.setTextColor(26, 26, 26);
          cursorY += 6;
          const lines = pdf.splitTextToSize(el.title || "", contentW);
          for (const ln of lines) {
            pdf.text(ln, leftX, cursorY);
            cursorY += 6;
          }
          cursorY += 2;
          break;
        }

        case "section-header": {
          cursorY = Math.max(cursorY, marginV + 20);
          const label = SECTION_LABELS[el.sectionType];
          if (label) {
            pdf.setFont(family, "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(136, 136, 136);
            pdf.text(label.toUpperCase(), pageW / 2, cursorY, { align: "center" });
            cursorY += 8;
          }
          pdf.setFont(family, "bold");
          pdf.setFontSize(14);
          pdf.setTextColor(26, 26, 26);
          const titleLines = pdf.splitTextToSize(el.title || "", contentW);
          pdf.text(titleLines, pageW / 2, cursorY, { align: "center" });
          cursorY += titleLines.length * 6 + 4;
          break;
        }

        case "paragraph": {
          // Flatten inline segments: text as-is, footnote refs as "[N]".
          const text = el.segments
            .map((s) => (s.type === "text" ? s.text : `[${s.n}]`))
            .join("");
          pdf.setFont(family, "normal");
          pdf.setFontSize(fontSize);
          pdf.setTextColor(51, 51, 51);

          const indent = el.indent ? 5 : 0;
          const lines = pdf.splitTextToSize(text, contentW - indent);
          for (let li = 0; li < lines.length; li++) {
            pdf.text(lines[li], li === 0 ? leftX + indent : leftX, cursorY);
            cursorY += lineHeightMm;
          }
          break;
        }

        case "footnotes-heading": {
          cursorY += fnLineHeightMm * 0.6;
          pdf.setDrawColor(136, 136, 136);
          pdf.setLineWidth(0.2);
          pdf.line(leftX, cursorY, leftX + contentW * 0.3, cursorY);
          cursorY += fnLineHeightMm * 0.6;
          pdf.setFont(family, "bold");
          pdf.setFontSize(fontSize - 1);
          pdf.setTextColor(85, 85, 85);
          pdf.text("NOTAS", leftX, cursorY);
          cursorY += fnLineHeightMm * 1.2;
          break;
        }

        case "footnote-item": {
          pdf.setFont(family, "normal");
          pdf.setFontSize(fnFontSize);
          pdf.setTextColor(68, 68, 68);
          const text = `${el.n}. ${el.content || "(sin contenido)"}`;
          const lines = pdf.splitTextToSize(text, contentW);
          for (const ln of lines) {
            pdf.text(ln, leftX, cursorY);
            cursorY += fnLineHeightMm;
          }
          cursorY += fnLineHeightMm * 0.2;
          break;
        }
      }
    }

    // Page number footer (matches preview behavior).
    if (typeof page.pageNumber === "number") {
      pdf.setFont(family, "normal");
      pdf.setFontSize(Math.max(7, fontSize - 4));
      pdf.setTextColor(170, 170, 170);
      pdf.text(String(page.pageNumber), pageW / 2, pageH - marginV * 0.4, { align: "center" });
    }
  });
}
