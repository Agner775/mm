-- Electrocredit: habilitar fechas para ofertas y promociones.
-- Ejecuta una sola vez en Supabase > SQL Editor > New query > Run.
alter table public.products add column if not exists promo_start date;
alter table public.products add column if not exists promo_end date;
