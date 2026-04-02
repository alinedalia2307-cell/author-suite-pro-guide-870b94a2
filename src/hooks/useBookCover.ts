import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useRef } from "react";
import type { CoverStyle, TextAlign } from "@/components/cover/CoverPreview";

export interface BookCover {
  id: string;
  book_id: string;
  title: string;
  subtitle: string;
  author: string;
  text_align: TextAlign;
  style: CoverStyle;
  bg_color: string;
  accent_color: string;
  use_gradient: boolean;
  bg_image_url: string | null;
}

export type BookCoverInput = Omit<BookCover, "id">;

export function useBookCover(bookId: string) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: cover, isLoading } = useQuery({
    queryKey: ["book_cover", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_covers")
        .select("*")
        .eq("book_id", bookId)
        .maybeSingle();
      if (error) throw error;
      return data as BookCover | null;
    },
    enabled: !!bookId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: BookCoverInput) => {
      const { data, error } = await supabase
        .from("book_covers")
        .upsert(
          { ...input, updated_at: new Date().toISOString() } as any,
          { onConflict: "book_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as BookCover;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["book_cover", bookId], data);
    },
  });

  const saveCover = useCallback(
    (input: BookCoverInput) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        upsertMutation.mutate(input);
      }, 800);
    },
    [upsertMutation]
  );

  return { cover, isLoading, saveCover };
}
