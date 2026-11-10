-- =============================================================================
-- Migración 003: unidades en pérdida total (PT).
-- Una unidad que no se libera y se va a pérdida total sale de "Unidades" y se
-- guarda en el apartado PT (no se borra: conserva inventario y fotos).
-- Ejecútala en Supabase → SQL Editor (es idempotente). Requiere la 002.
-- =============================================================================

alter table public.unidades add column if not exists pt_fecha timestamptz;
alter table public.unidades add column if not exists pt_motivo text;
alter table public.unidades add column if not exists pt_registrado_por text;

create index if not exists unidades_pt_idx on public.unidades(pt_fecha) where pt_fecha is not null;
