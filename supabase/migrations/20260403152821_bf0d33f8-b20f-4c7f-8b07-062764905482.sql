
-- Create enum for section types
CREATE TYPE public.section_type AS ENUM (
  'dedicatoria',
  'prologo',
  'capitulo',
  'epilogo',
  'agradecimientos',
  'texto_libre'
);

-- Add section_type column with default 'capitulo'
ALTER TABLE public.chapters
ADD COLUMN section_type public.section_type NOT NULL DEFAULT 'capitulo';
