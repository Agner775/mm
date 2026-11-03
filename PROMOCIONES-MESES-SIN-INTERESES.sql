-- Electrocredit: campos para promociones de meses sin intereses.
alter table public.products add column if not exists interest_free_months integer;
alter table public.products add column if not exists interest_free_start date;
alter table public.products add column if not exists interest_free_end date;
