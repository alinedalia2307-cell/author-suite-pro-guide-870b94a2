import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Manuscript {
  id: string;
  book_id: string;
  content: string;
  source: string;
  original_filename: string | null;
  word_count: number;
  created_at: string;
  updated_at: string;
}

const AUTOSAVE_MS = 2000;

export function useManuscriptDb(bookId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [localContent, setLocalContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof setTimeout>>();
  const contentRef = useRef<string>("");

  const queryKey = ["manuscript", bookId];

  const { data: manuscript, isLoading } = useQuery({
    queryKey,
    enabled: !!bookId,
    queryFn: async (): Promise<Manuscript | null> => {
      const { data, error } = await supabase
        .from("manuscripts")
        .select("*")
        .eq("book_id", bookId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Manuscript | null;
    },
  });

  // Sync remote -> local on first load
  useEffect(() => {
    if (manuscript && localContent === null) {
      setLocalContent(manuscript.content);
      contentRef.current = manuscript.content;
    }
  }, [manuscript, localContent]);

  const content = localContent ?? manuscript?.content ?? "";

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  const saveMutation = useMutation({
    mutationFn: async (params: { content: string; source?: string; filename?: string }) => {
      setIsSaving(true);
      const wc = params.content.trim().split(/\s+/).filter(Boolean).length;

      if (manuscript) {
        const { error } = await supabase
          .from("manuscripts")
          .update({
            content: params.content,
            word_count: wc,
            updated_at: new Date().toISOString(),
            ...(params.source ? { source: params.source } : {}),
            ...(params.filename ? { original_filename: params.filename } : {}),
          })
          .eq("id", manuscript.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("manuscripts")
          .insert({
            book_id: bookId!,
            content: params.content,
            word_count: wc,
            source: params.source ?? "manual",
            original_filename: params.filename ?? null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      setIsSaving(false);
      toast({ title: "Error", description: "No se pudo guardar el manuscrito.", variant: "destructive" });
    },
  });

  const updateContent = useCallback(
    (newContent: string) => {
      setLocalContent(newContent);
      contentRef.current = newContent;

      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      autosaveRef.current = setTimeout(() => {
        saveMutation.mutate({ content: contentRef.current });
      }, AUTOSAVE_MS);
    },
    [saveMutation]
  );

  const saveNow = useCallback(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    saveMutation.mutate({ content: contentRef.current });
    toast({ title: "Guardado", description: "Manuscrito guardado correctamente." });
  }, [saveMutation, toast]);

  const importContent = useCallback(
    (text: string, source: string, filename?: string) => {
      setLocalContent(text);
      contentRef.current = text;
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      saveMutation.mutate({ content: text, source, filename });
    },
    [saveMutation]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, []);

  return {
    content,
    manuscript,
    isLoading,
    isSaving,
    wordCount,
    charCount,
    updateContent,
    saveNow,
    importContent,
    exists: !!manuscript,
  };
}
