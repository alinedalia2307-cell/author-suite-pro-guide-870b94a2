import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const SECTION_TYPES = [
  { value: "dedicatoria", label: "Dedicatoria", icon: "💐" },
  { value: "prologo", label: "Prólogo", icon: "📖" },
  { value: "capitulo", label: "Capítulo", icon: "📄" },
  { value: "subcapitulo", label: "Subcapítulo", icon: "📑" },
  { value: "epilogo", label: "Epílogo", icon: "🔚" },
  { value: "agradecimientos", label: "Agradecimientos", icon: "🙏" },
  { value: "texto_libre", label: "Texto libre", icon: "✏️" },
] as const;

export type SectionType = (typeof SECTION_TYPES)[number]["value"];

export interface Chapter {
  id: string;
  book_id: string;
  title: string;
  content: string;
  position: number;
  word_count: number;
  section_type: SectionType;
  created_at: string;
  updated_at: string;
}

const AUTOSAVE_MS = 2000;

export function useChapters(bookId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ["chapters", bookId];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [localContent, setLocalContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof setTimeout>>();
  const contentRef = useRef("");

  // ── Fetch chapters ──
  const { data: chapters = [], isLoading } = useQuery({
    queryKey,
    enabled: !!bookId,
    queryFn: async (): Promise<Chapter[]> => {
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("book_id", bookId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Chapter[];
    },
  });

  // Auto-select first chapter
  useEffect(() => {
    if (chapters.length > 0 && (!activeId || !chapters.find((c) => c.id === activeId))) {
      setActiveId(chapters[0].id);
      setLocalContent(chapters[0].content);
      contentRef.current = chapters[0].content;
    }
  }, [chapters, activeId]);

  const activeChapter = chapters.find((c) => c.id === activeId) ?? null;

  // Sync content when switching chapters
  const selectChapter = useCallback(
    (id: string) => {
      // Flush pending autosave for current chapter
      if (autosaveRef.current) {
        clearTimeout(autosaveRef.current);
        autosaveRef.current = undefined;
      }
      if (activeId && contentRef.current !== (activeChapter?.content ?? "")) {
        // Save current before switching
        const wc = contentRef.current.trim().split(/\s+/).filter(Boolean).length;
        supabase
          .from("chapters")
          .update({ content: contentRef.current, word_count: wc, updated_at: new Date().toISOString() })
          .eq("id", activeId)
          .then(() => queryClient.invalidateQueries({ queryKey }));
      }

      const ch = chapters.find((c) => c.id === id);
      setActiveId(id);
      setLocalContent(ch?.content ?? "");
      contentRef.current = ch?.content ?? "";
    },
    [activeId, activeChapter, chapters, queryClient, queryKey]
  );

  // ── Content editing with autosave ──
  const updateContent = useCallback(
    (text: string) => {
      setLocalContent(text);
      contentRef.current = text;
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      autosaveRef.current = setTimeout(() => {
        if (!activeId) return;
        setIsSaving(true);
        const wc = contentRef.current.trim().split(/\s+/).filter(Boolean).length;
        supabase
          .from("chapters")
          .update({ content: contentRef.current, word_count: wc, updated_at: new Date().toISOString() })
          .eq("id", activeId)
          .then(({ error }) => {
            setIsSaving(false);
            if (!error) queryClient.invalidateQueries({ queryKey });
          });
      }, AUTOSAVE_MS);
    },
    [activeId, queryClient, queryKey]
  );

  const saveNow = useCallback(() => {
    if (!activeId) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    setIsSaving(true);
    const wc = contentRef.current.trim().split(/\s+/).filter(Boolean).length;
    supabase
      .from("chapters")
      .update({ content: contentRef.current, word_count: wc, updated_at: new Date().toISOString() })
      .eq("id", activeId)
      .then(({ error }) => {
        setIsSaving(false);
        if (!error) {
          queryClient.invalidateQueries({ queryKey });
          toast({ title: "Guardado", description: "Capítulo guardado correctamente." });
        }
      });
  }, [activeId, queryClient, queryKey, toast]);

  // ── CRUD ──
  const addChapter = useMutation({
    mutationFn: async (sectionType: SectionType = "capitulo") => {
      const sameType = chapters.filter((c) => c.section_type === sectionType);
      const typeLabel = SECTION_TYPES.find((s) => s.value === sectionType)?.label ?? "Sección";
      const title = sectionType === "capitulo"
        ? `Capítulo ${sameType.length + 1}`
        : typeLabel;
      const nextPos = chapters.length > 0 ? Math.max(...chapters.map((c) => c.position)) + 1 : 0;
      const { data, error } = await supabase
        .from("chapters")
        .insert({
          book_id: bookId!,
          title,
          position: nextPos,
          section_type: sectionType,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Chapter;
    },
    onSuccess: (ch) => {
      queryClient.invalidateQueries({ queryKey });
      setActiveId(ch.id);
      setLocalContent("");
      contentRef.current = "";
    },
  });

  const renameChapter = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("chapters").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteChapter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey });
      if (activeId === deletedId) {
        setActiveId(null);
        setLocalContent(null);
      }
    },
  });

  const moveChapter = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const idx = chapters.findIndex((c) => c.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= chapters.length) return;

      const a = chapters[idx];
      const b = chapters[swapIdx];

      await Promise.all([
        supabase.from("chapters").update({ position: b.position }).eq("id", a.id),
        supabase.from("chapters").update({ position: a.position }).eq("id", b.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const content = localContent ?? activeChapter?.content ?? "";
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  // Cleanup
  useEffect(() => {
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, []);

  return {
    chapters,
    activeId,
    activeChapter,
    content,
    isLoading,
    isSaving,
    wordCount,
    charCount,
    selectChapter,
    updateContent,
    saveNow,
    addChapter,
    renameChapter,
    deleteChapter,
    moveChapter,
  };
}
