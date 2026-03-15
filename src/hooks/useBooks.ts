import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Book {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  language: string;
  status: "draft" | "uploading" | "correcting" | "formatting" | "publishing" | "published";
  created_at: string;
  updated_at: string;
}

export type CreateBookInput = Pick<Book, "title"> & Partial<Pick<Book, "subtitle" | "author" | "language">>;

const QUERY_KEY = ["books"];

export function useBooks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const booksQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Book[];
    },
  });

  const createBook = useMutation({
    mutationFn: async (input: CreateBookInput) => {
      const { data, error } = await supabase
        .from("books")
        .insert({
          title: input.title,
          subtitle: input.subtitle ?? "",
          author: input.author ?? "",
          language: input.language ?? "es",
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Book;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Libro creado", description: "Tu nuevo proyecto de libro está listo." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el libro.", variant: "destructive" });
    },
  });

  const deleteBook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Libro eliminado" });
    },
  });

  return { books: booksQuery.data ?? [], isLoading: booksQuery.isLoading, createBook, deleteBook };
}

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: ["book", id],
    enabled: !!id,
    queryFn: async (): Promise<Book> => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as Book;
    },
  });
}

const STATUS_LABELS: Record<Book["status"], string> = {
  draft: "Borrador",
  uploading: "Subiendo manuscrito",
  correcting: "En corrección",
  formatting: "En maquetación",
  publishing: "Publicando",
  published: "Publicado",
};

export function getStatusLabel(status: Book["status"]) {
  return STATUS_LABELS[status] ?? status;
}
