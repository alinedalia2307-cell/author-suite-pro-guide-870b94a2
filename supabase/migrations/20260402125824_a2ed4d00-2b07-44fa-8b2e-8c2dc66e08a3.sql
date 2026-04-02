
CREATE TABLE public.book_covers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  text_align TEXT NOT NULL DEFAULT 'left',
  style TEXT NOT NULL DEFAULT 'classic',
  bg_color TEXT NOT NULL DEFAULT '#1a1a2e',
  accent_color TEXT NOT NULL DEFAULT '#e94560',
  use_gradient BOOLEAN NOT NULL DEFAULT false,
  bg_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.book_covers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to book_covers"
ON public.book_covers
FOR ALL
USING (true)
WITH CHECK (true);
