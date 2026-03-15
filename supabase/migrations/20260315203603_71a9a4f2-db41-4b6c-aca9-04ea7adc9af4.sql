
CREATE TYPE public.book_status AS ENUM ('draft', 'uploading', 'correcting', 'formatting', 'publishing', 'published');

CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'es',
  status book_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Public access for now (no auth yet)
CREATE POLICY "Allow full access to books" ON public.books FOR ALL USING (true) WITH CHECK (true);
