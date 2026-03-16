
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Sin título',
  content text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chapters_book_position ON public.chapters(book_id, position);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to chapters" ON public.chapters
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);
