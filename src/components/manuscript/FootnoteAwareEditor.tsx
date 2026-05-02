import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StickyNote, Trash2, Plus, X } from "lucide-react";
import { useFootnotes, generateMarker, FOOTNOTE_REGEX } from "@/hooks/useFootnotes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  chapterId: string;
  content: string;
  onContentChange: (next: string) => void;
  fontFamily?: string;
}

interface FloatingMenu {
  x: number;
  y: number;
  selStart: number;
  selEnd: number;
  selectedText: string;
}

/**
 * Editor surface with footnote support.
 * - Selection on the textarea shows a floating "Add footnote" button.
 * - A toolbar button inserts a footnote at the current caret.
 * - Footnotes are persisted in `footnotes` table; markers like [[fn:abcd1234]]
 *   are stored inline in the chapter content.
 * - A side panel lists all footnotes for the chapter (edit, delete, jump).
 */
export default function FootnoteAwareEditor({ chapterId, content, onContentChange, fontFamily }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<FloatingMenu | null>(null);
  const [focusedFootnoteId, setFocusedFootnoteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();

  const { footnotes, addFootnote, updateFootnote, deleteFootnote } = useFootnotes(chapterId);

  // Map marker -> sequential number, in order of appearance in the text
  const numbering = useMemo(() => {
    const map = new Map<string, number>();
    let n = 1;
    let m: RegExpExecArray | null;
    const re = new RegExp(FOOTNOTE_REGEX.source, "g");
    while ((m = re.exec(content)) !== null) {
      if (!map.has(m[1])) {
        map.set(m[1], n);
        n++;
      }
    }
    return map;
  }, [content]);

  // Compute caret coordinates for selection (using a hidden mirror)
  const showFloatingMenu = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setMenu(null);
      return;
    }
    const selectedText = ta.value.slice(start, end);
    if (!selectedText.trim()) {
      setMenu(null);
      return;
    }

    // Position the menu above the selection end, using a rough caret coords approach
    const rect = ta.getBoundingClientRect();
    const mirror = document.createElement("div");
    const style = window.getComputedStyle(ta);
    [
      "boxSizing", "width", "fontSize", "fontFamily", "fontWeight",
      "lineHeight", "letterSpacing", "padding", "border", "whiteSpace",
      "wordWrap", "overflowWrap",
    ].forEach((p) => {
      (mirror.style as unknown as Record<string, string>)[p] =
        (style as unknown as Record<string, string>)[p];
    });
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.top = "0";
    mirror.style.left = "-9999px";
    mirror.style.height = "auto";

    const before = ta.value.slice(0, end);
    mirror.textContent = before;
    const marker = document.createElement("span");
    marker.textContent = "|";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const mRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    document.body.removeChild(mirror);

    const x = rect.left + (mRect.left - mirrorRect.left) - ta.scrollLeft;
    const y = rect.top + (mRect.top - mirrorRect.top) - ta.scrollTop;

    setMenu({
      x: Math.min(x, rect.right - 180),
      y: Math.max(rect.top + 8, y - 42),
      selStart: start,
      selEnd: end,
      selectedText,
    });
  }, []);

  // Hide menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-fn-menu]")) return;
      if (target === textareaRef.current) return;
      setMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Insert a footnote at given range
  const handleAddFootnote = useCallback(
    async (selStart: number, selEnd: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const marker = generateMarker();
      const insertion = `[[fn:${marker}]]`;
      // Insert AFTER the selected text (or at caret if no selection)
      const insertPos = selEnd;
      const newContent = content.slice(0, insertPos) + insertion + content.slice(insertPos);
      onContentChange(newContent);

      try {
        const created = await addFootnote.mutateAsync({ marker, content: "" });
        setMenu(null);
        // Open the editor for the new footnote
        setTimeout(() => {
          setFocusedFootnoteId(created.id);
          setEditingId(created.id);
          setEditValue("");
        }, 50);
      } catch (e) {
        toast({ title: "Error", description: "No se pudo crear la nota.", variant: "destructive" });
      }
    },
    [content, onContentChange, addFootnote, toast]
  );

  const handleAddAtCaret = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionEnd;
    handleAddFootnote(pos, pos);
  }, [handleAddFootnote]);

  const handleDeleteFootnote = useCallback(
    async (id: string, marker: string) => {
      // Remove inline marker from text
      const re = new RegExp(`\\[\\[fn:${marker}\\]\\]`, "g");
      const next = content.replace(re, "");
      if (next !== content) onContentChange(next);
      await deleteFootnote.mutateAsync(id);
      if (focusedFootnoteId === id) setFocusedFootnoteId(null);
      if (editingId === id) setEditingId(null);
    },
    [content, onContentChange, deleteFootnote, focusedFootnoteId, editingId]
  );

  const preview = useMemo(() => {
    const parts: Array<{ type: "text" | "fn"; value: string; n?: number; marker?: string }> = [];
    let lastIdx = 0;
    const re = new RegExp(FOOTNOTE_REGEX.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m.index > lastIdx) {
        parts.push({ type: "text", value: content.slice(lastIdx, m.index) });
      }
      const marker = m[1];
      parts.push({ type: "fn", value: "", n: numbering.get(marker), marker });
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < content.length) {
      parts.push({ type: "text", value: content.slice(lastIdx) });
    }
    return parts;
  }, [content, numbering]);

  const jumpToFootnoteInText = useCallback((marker: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const idx = content.indexOf(`[[fn:${marker}]]`);
    if (idx < 0) return;
    ta.focus();
    ta.setSelectionRange(idx, idx + `[[fn:${marker}]]`.length);
    // Approximate scroll
    const ratio = idx / Math.max(1, content.length);
    ta.scrollTop = ratio * (ta.scrollHeight - ta.clientHeight);
  }, [content]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-0">
        {/* Editor column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Local toolbar */}
          <div className="flex items-center gap-2 px-6 py-2 border-b border-border bg-card/50">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5"
              onClick={handleAddAtCaret}
            >
              <StickyNote className="w-3.5 h-3.5" />
              Nota al pie
            </Button>
            <span className="text-[10px] text-muted-foreground/70 ml-1">
              Selecciona texto para añadir una nota a un fragmento
            </span>
          </div>

          {/* Editor body */}
          <div ref={overlayRef} className="flex-1 overflow-y-auto relative">
            <div className="max-w-2xl mx-auto px-8 py-10">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                onSelect={showFloatingMenu}
                onKeyUp={showFloatingMenu}
                onMouseUp={showFloatingMenu}
                onScroll={() => setMenu(null)}
                placeholder="Empieza a escribir…"
                spellCheck
                className="w-full min-h-[60vh] resize-none border-0 bg-transparent font-body text-base leading-[1.9] text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                style={{ fontFamily }}
              />

              {/* Live preview strip */}
              {numbering.size > 0 && (
                <div className="mt-6 pt-4 border-t border-dashed border-border/60">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">
                    Vista previa con notas
                  </div>
                  <div
                    className="text-base leading-[1.9] text-foreground/80 font-body whitespace-pre-wrap"
                    style={{ fontFamily }}
                  >
                    {preview.map((p, i) => {
                      if (p.type === "text") return <span key={i}>{p.value}</span>;
                      const fn = footnotes.find((f) => f.marker === p.marker);
                      return (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <sup
                              className={cn(
                                "mx-0.5 px-1 rounded cursor-pointer text-accent font-semibold transition-colors",
                                focusedFootnoteId === fn?.id ? "bg-accent/20" : "hover:bg-accent/10"
                              )}
                              onClick={() => {
                                if (fn) {
                                  setFocusedFootnoteId(fn.id);
                                  document
                                    .getElementById(`fn-${fn.id}`)
                                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                              }}
                            >
                              {p.n}
                            </sup>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {fn?.content || <em className="text-muted-foreground">Sin contenido</em>}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Floating selection menu */}
            {menu && (
              <div
                data-fn-menu
                className="fixed z-50 bg-popover border border-border rounded-md shadow-lg px-1 py-1 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150"
                style={{ left: menu.x, top: menu.y }}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => handleAddFootnote(menu.selStart, menu.selEnd)}
                >
                  <StickyNote className="w-3.5 h-3.5 text-accent" />
                  Añadir nota al pie
                </Button>
                <button
                  onClick={() => setMenu(null)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footnotes side panel */}
        <aside className="w-72 shrink-0 border-l border-border bg-secondary/20 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notas al pie
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleAddAtCaret}
              title="Añadir nota en el cursor"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {footnotes.length === 0 && (
                <p className="text-xs text-muted-foreground/70 text-center py-8 px-2">
                  No hay notas en este capítulo. Selecciona texto y pulsa
                  <span className="font-medium text-foreground/80"> “Añadir nota al pie”</span>.
                </p>
              )}
              {footnotes
                .slice()
                .sort((a, b) => (numbering.get(a.marker) ?? 999) - (numbering.get(b.marker) ?? 999))
                .map((fn) => {
                  const num = numbering.get(fn.marker);
                  const orphan = num === undefined;
                  const focused = focusedFootnoteId === fn.id;
                  return (
                    <div
                      key={fn.id}
                      id={`fn-${fn.id}`}
                      className={cn(
                        "rounded-md border p-2.5 cursor-pointer transition-all",
                        focused ? "border-accent bg-accent/5 shadow-sm" : "border-border bg-card hover:border-accent/40"
                      )}
                      onClick={() => {
                        setFocusedFootnoteId(fn.id);
                        if (!orphan) jumpToFootnoteInText(fn.marker);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "inline-flex items-center justify-center min-w-5 h-5 rounded text-[10px] font-bold px-1",
                            orphan ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent"
                          )}>
                            {orphan ? "!" : num}
                          </span>
                          {orphan && (
                            <span className="text-[10px] text-destructive">Sin referencia</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFootnote(fn.id, fn.marker);
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Eliminar nota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {editingId === fn.id ? (
                        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <Textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={async () => {
                              if (editValue !== fn.content) {
                                await updateFootnote.mutateAsync({ id: fn.id, content: editValue });
                              }
                              setEditingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setEditingId(null);
                              }
                            }}
                            autoFocus
                            placeholder="Escribe el contenido de la nota…"
                            className="text-xs min-h-[60px] resize-none"
                          />
                        </div>
                      ) : (
                        <p
                          className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap break-words"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(fn.id);
                            setEditValue(fn.content);
                          }}
                        >
                          {fn.content || (
                            <span className="italic text-muted-foreground/70">
                              Haz clic para escribir…
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </TooltipProvider>
  );
}
