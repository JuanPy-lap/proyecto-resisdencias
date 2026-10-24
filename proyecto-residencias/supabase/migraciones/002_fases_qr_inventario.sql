-- =============================================================================
-- Migración 002: fases del taller, QR por taller e inventario tipo hoja.
-- Solo si ya habías ejecutado la versión anterior de supabase/schema.sql.
-- Ejecútala completa en Supabase → SQL Editor (es idempotente).
-- =============================================================================

begin;

-- 1) Fases: Ingreso → Espera de Liberación → Proceso → Control de Calidad → Entrega
alter table public.unidades drop constraint if exists unidades_estado_unidad_check;

-- Se convierten los estados anteriores al flujo real de la empresa.
update public.unidades set estado_unidad = case estado_unidad
  when 'En Diagnóstico' then 'Espera de Liberación'
  when 'En Proceso'     then 'Proceso'
  when 'Liberada'       then 'Control de Calidad'
  when 'Entregada'      then 'Entrega'
  else estado_unidad
end;

alter table public.unidades add constraint unidades_estado_unidad_check
  check (estado_unidad in ('Ingreso','Espera de Liberación','Proceso','Control de Calidad','Entrega'));

-- 2) Historial de fases + trigger que impide regresar o saltarse fases
create table if not exists public.historial_estados (
  id             uuid primary key default gen_random_uuid(),
  unidad_id      uuid not null references public.unidades(id) on delete cascade,
  estado         text not null,
  registrado_por text not null default 'sistema',
  created_at     timestamptz not null default now()
);
create index if not exists historial_estados_unidad_idx on public.historial_estados(unidad_id, created_at);

-- Las unidades existentes arrancan su historial con su fase actual.
insert into public.historial_estados (unidad_id, estado, registrado_por, created_at)
select u.id, u.estado_unidad, 'migración', u.created_at
from public.unidades u
where not exists (select 1 from public.historial_estados h where h.unidad_id = u.id);

create or replace function public.validar_fase_unidad() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  fases text[] := array['Ingreso','Espera de Liberación','Proceso','Control de Calidad','Entrega'];
  antes int;
  despues int;
begin
  if tg_op = 'UPDATE' then
    if new.estado_unidad = old.estado_unidad then
      return new;
    end if;
    antes := array_position(fases, old.estado_unidad);
    despues := array_position(fases, new.estado_unidad);
    if despues < antes then
      raise exception 'La unidad ya pasó por «%»: no se puede regresar a «%».', old.estado_unidad, new.estado_unidad;
    end if;
    if despues > antes + 1 then
      raise exception 'Primero registra la fase «%».', fases[antes + 1];
    end if;
  end if;
  insert into public.historial_estados (unidad_id, estado, registrado_por)
  values (new.id, new.estado_unidad, coalesce(auth.jwt() ->> 'email', 'sistema'));
  return new;
end $$;

drop trigger if exists unidades_validar_fase on public.unidades;
create trigger unidades_validar_fase
  after insert or update of estado_unidad on public.unidades
  for each row execute function public.validar_fase_unidad();

alter table public.historial_estados enable row level security;
drop policy if exists "autenticados_todo" on public.historial_estados;
create policy "autenticados_todo" on public.historial_estados
  for all to authenticated using (true) with check (true);

-- 3) QR: mismo cono en varios talleres + fecha de retiro programada
alter table public.etiquetas_qr_rastreo drop constraint if exists etiquetas_qr_rastreo_codigo_qr_key;
alter table public.etiquetas_qr_rastreo add column if not exists fecha_retiro_programada date;
alter table public.etiquetas_qr_rastreo alter column estado set default 'Colocada';
create unique index if not exists etiquetas_qr_cono_taller_activo_idx
  on public.etiquetas_qr_rastreo(codigo_qr, taller) where estado <> 'Retirada';

-- 4) Inventario con el formato de la hoja "Inventario físico estado unidad"
alter table public.inventarios_ingreso add column if not exists checklist jsonb not null default '{}'::jsonb;
alter table public.inventarios_ingreso add column if not exists datos_hoja jsonb not null default '{}'::jsonb;
alter table public.inventarios_ingreso add column if not exists nivel_combustible_rh integer
  check (nivel_combustible_rh between 0 and 100);
alter table public.inventarios_ingreso add column if not exists observaciones text;
alter table public.inventarios_ingreso add column if not exists supervisor text;
alter table public.danos_diagrama alter column tipo_dano set default 'golpe';

commit;
