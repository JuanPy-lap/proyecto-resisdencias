-- =============================================================================
-- Esquema de la base de datos del Sistema NGR Taller (Supabase / Postgres).
-- Ejecútalo en Supabase → SQL Editor. Es idempotente: se puede correr varias veces.
-- Debe mantenerse sincronizado con src/types/supabase.ts.
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. unidades ------------------------------------------------------------------
create table if not exists public.unidades (
  id                   uuid primary key default gen_random_uuid(),
  unidad_eco           text not null unique,
  vin                  text,
  modelo               text,
  cliente_aseguradora  text,
  tipo_golpe           text,
  fecha_ingreso        date not null default current_date,
  fecha_compromiso     date,
  responsable_asignado text,
  estado_unidad        text not null default 'Ingreso'
    check (estado_unidad in ('Ingreso','En Diagnóstico','En Proceso','Control de Calidad','Liberada','Entregada')),
  created_at           timestamptz not null default now()
);

-- 2. inventarios_ingreso -------------------------------------------------------
create table if not exists public.inventarios_ingreso (
  id                       uuid primary key default gen_random_uuid(),
  unidad_id                uuid not null references public.unidades(id) on delete cascade,
  kilometraje              integer not null check (kilometraje >= 0),
  nivel_combustible        integer not null check (nivel_combustible between 0 and 100),
  tiene_gato_hidraulico    boolean not null default false,
  tiene_extintor           boolean not null default false,
  tiene_llanta_refaccion   boolean not null default false,
  observaciones_mecanicas  text,
  observaciones_carroceria text,
  firma_operador_url       text,
  capturado_por            text not null,
  created_at               timestamptz not null default now()
);
create index if not exists inventarios_ingreso_unidad_idx on public.inventarios_ingreso(unidad_id);

-- 3. danos_diagrama ------------------------------------------------------------
create table if not exists public.danos_diagrama (
  id            uuid primary key default gen_random_uuid(),
  inventario_id uuid not null references public.inventarios_ingreso(id) on delete cascade,
  posicion_x    numeric(5,2) not null check (posicion_x between 0 and 100),
  posicion_y    numeric(5,2) not null check (posicion_y between 0 and 100),
  vista         text not null check (vista in ('frontal','lateral_izquierdo','lateral_derecho','trasera','superior')),
  tipo_dano     text not null check (tipo_dano in ('golpe','rayon','abolladura','rotura','faltante','oxido')),
  descripcion   text,
  created_at    timestamptz not null default now()
);
create index if not exists danos_diagrama_inventario_idx on public.danos_diagrama(inventario_id);

-- 4. fotografias_unidad --------------------------------------------------------
create table if not exists public.fotografias_unidad (
  id           uuid primary key default gen_random_uuid(),
  unidad_id    uuid not null references public.unidades(id) on delete cascade,
  etapa        text not null check (etapa in ('Ingreso','Proceso','Terminado')),
  seccion      text,
  url_publica  text not null,
  ruta_storage text not null unique,
  peso_kb      integer not null,
  subido_por   text not null,
  created_at   timestamptz not null default now()
);
create index if not exists fotografias_unidad_unidad_idx on public.fotografias_unidad(unidad_id, created_at desc);

-- 5. etiquetas_qr_rastreo ------------------------------------------------------
create table if not exists public.etiquetas_qr_rastreo (
  id               uuid primary key default gen_random_uuid(),
  unidad_id        uuid not null references public.unidades(id) on delete cascade,
  codigo_qr        text not null unique,
  taller           text not null,
  ubicacion_rack   text,
  estado           text not null default 'Pendiente' check (estado in ('Pendiente','Colocada','Retirada')),
  fecha_colocacion timestamptz,
  fecha_retiro     timestamptz,
  retirado_por     text,
  created_at       timestamptz not null default now()
);
create index if not exists etiquetas_qr_unidad_idx on public.etiquetas_qr_rastreo(unidad_id);

-- =============================================================================
-- Seguridad (RLS): solo usuarios con sesión iniciada leen y escriben.
-- La app usa la anon key en el navegador, así que esto es lo que protege los datos.
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array['unidades','inventarios_ingreso','danos_diagrama','fotografias_unidad','etiquetas_qr_rastreo'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "autenticados_todo" on public.%I', t);
    execute format('create policy "autenticados_todo" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- =============================================================================
-- Storage: bucket público para las fotos (lectura pública por URL, escritura solo con sesión).
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('fotos-tractocamiones', 'fotos-tractocamiones', true)
on conflict (id) do update set public = true;

drop policy if exists "fotos_subir_autenticados" on storage.objects;
create policy "fotos_subir_autenticados" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos-tractocamiones');

drop policy if exists "fotos_borrar_autenticados" on storage.objects;
create policy "fotos_borrar_autenticados" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos-tractocamiones');

drop policy if exists "fotos_leer_autenticados" on storage.objects;
create policy "fotos_leer_autenticados" on storage.objects
  for select to authenticated using (bucket_id = 'fotos-tractocamiones');
