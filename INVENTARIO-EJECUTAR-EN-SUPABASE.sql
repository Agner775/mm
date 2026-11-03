-- EC-10: agregar existencias sin borrar productos ni promociones.
-- Los productos existentes comienzan con 0 (Agotado) hasta que actualices su cantidad.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_stock_quantity_nonnegative;
ALTER TABLE public.products
  ADD CONSTRAINT products_stock_quantity_nonnegative CHECK (stock_quantity >= 0);
