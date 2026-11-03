-- EC-12: agrega el indicador de producto destacado sin modificar productos existentes.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS products_is_featured_idx ON public.products (is_featured) WHERE is_featured = true;
