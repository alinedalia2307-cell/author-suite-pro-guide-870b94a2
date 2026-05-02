import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Footnote {
  id: string;
  chapter_id: string;
  marker: string;
  content: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export const FOOTNOTE_REGEX = /\[\[fn:([a-z0-9]{6,12})\]\]/g;

export function generateMarker(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Hook to manage footnotes for a single chapter.
 */
export function useFootnotes(chapterId: string | null | undefined) {
  const qc = useQueryClient();
  const queryKey = ["footnotes", chapterId];

  const { data: footnotes = [], isLoading } = useQuery({
    queryKey,
    enabled: !!chapterId,
    queryFn: async (): Promise<Footnote[]> => {
      const { data, error } = await supabase
        .from("footnotes")
        .select("*")
        .eq("chapter_id", chapterId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Footnote[];
    },
  });

  const addFootnote = useMutation({
    mutationFn: async ({ marker, content }: { marker: string; content: string }) => {
      if (!chapterId) throw new Error("No chapter");
      const nextPos = footnotes.length;
      const { data, error } = await supabase
        .from("footnotes")
        .insert({ chapter_id: chapterId, marker, content, position: nextPos })
        .select()
        .single();
      if (error) throw error;
      return data as Footnote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const updateFootnote = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("footnotes")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const deleteFootnote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("footnotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const findByMarker = useCallback(
    (marker: string) => footnotes.find((f) => f.marker === marker),
    [footnotes]
  );

  return { footnotes, isLoading, addFootnote, updateFootnote, deleteFootnote, findByMarker };
}

/**
 * Fetch all footnotes for a list of chapters (used in layout/PDF).
 */
export function useAllFootnotes(chapterIds: string[]) {
  return useQuery({
    queryKey: ["footnotes-all", chapterIds.sort().join(",")],
    enabled: chapterIds.length > 0,
    queryFn: async (): Promise<Footnote[]> => {
      const { data, error } = await supabase
        .from("footnotes")
        .select("*")
        .in("chapter_id", chapterIds);
      if (error) throw error;
      return (data ?? []) as Footnote[];
    },
  });
}
