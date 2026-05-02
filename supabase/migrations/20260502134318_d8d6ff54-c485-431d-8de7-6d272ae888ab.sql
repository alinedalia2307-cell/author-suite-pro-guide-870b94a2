CREATE TABLE public.footnotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL,
  marker TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_footnotes_chapter_id ON public.footnotes(chapter_id);
CREATE UNIQUE INDEX idx_footnotes_chapter_marker ON public.footnotes(chapter_id, marker);

ALTER TABLE public.footnotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to footnotes"
ON public.footnotes
FOR ALL
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_footnotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_footnotes_updated_at
BEFORE UPDATE ON public.footnotes
FOR EACH ROW
EXECUTE FUNCTION public.update_footnotes_updated_at();