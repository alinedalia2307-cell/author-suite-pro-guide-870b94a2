
CREATE TABLE public.manuscripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  original_filename text,
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id)
);

ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to manuscripts" ON public.manuscripts
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);
