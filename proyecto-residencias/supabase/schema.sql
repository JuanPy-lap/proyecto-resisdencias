-- =============================================================================
-- Esquema de la base de datos del Sistema NGR Taller (Supabase / Postgres).
-- Instalación nueva: ejecútalo completo en Supabase → SQL Editor.
-- Si ya habías corrido una versión anterior, ejecuta en su lugar
-- supabase/migraciones/002_fases_qr_inventario.sql.
-- Es idempotente y debe mantenerse sincronizado con src/types/supabase.ts.
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. unidades ------------------------------------------------------------------
-- unidad_eco es el número de cono con el que el taller identifica la unidad.
-- Fases del taller (solo avanzan, nunca regresan; lo valida un trigger):
--   Ingreso → Espera de Liberación → Proceso → Control de Calidad → Entrega
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
    constraint unidades_estado_unidad_check
    check (estado_unidad in ('Ingreso','Espera de Liberación','Proceso','Control de Calidad','Entrega')),
  created_at           timestamptz not null default now()
);

-- 2. historial_estados: cuándo y quién registró cada fase ----------------------
create table if not exists public.historial_estados (
  id             uuid primary key default gen_random_uuid(),
  unidad_id      uuid not null references public.unidades(id) on delete cascade,
  estado         text not null,
  registrado_por text not null default 'sistema',
  created_at     timestamptz not null default now()
);
create index if not exists historial_estados_unidad_idx on public.historial_estados(unidad_id, created_at);

-- Valida que la fase solo avance de una en una y deja registro en el historial.
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

-- 3. inventarios_ingreso -------------------------------------------------------
-- Hoja "Inventario físico estado unidad" (Depto. Operativo RSAD):
--   datos_hoja = encabezado (cliente, CIA, marca, tipo, modelo, placas, color,
--                motor, serie, tarjeta IAVE, llantas)
--   checklist  = partes y accesorios: clave → { cant, estado B/R/M } o { si }
--   (catálogo en src/lib/hojaInventario.ts)
-- nivel_combustible = tanque LH, nivel_combustible_rh = tanque RH.
create table if not exists public.inventarios_ingreso (
  id                       uuid primary key default gen_random_uuid(),
  unidad_id                uuid not null references public.unidades(id) on delete cascade,
  kilometraje              integer not null check (kilometraje >= 0),
  nivel_combustible        integer not null check (nivel_combustible between 0 and 100),
  nivel_combustible_rh     integer check (nivel_combustible_rh between 0 and 100),
  tiene_gato_hidraulico    boolean not null default false,
  tiene_extintor           boolean not null default false,
  tiene_llanta_refaccion   boolean not null default false,
  datos_hoja               jsonb not null default '{}'::jsonb,
  checklist                jsonb not null default '{}'::jsonb,
  observaciones            text,
  supervisor               text,
  observaciones_mecanicas  text,
  observaciones_carroceria text,
  firma_operador_url       text,
  capturado_por            text not null,
  created_at               timestamptz not null default now()
);
create index if not exists inventarios_ingreso_unidad_idx on public.inventarios_ingreso(unidad_id);

-- 4. danos_diagrama ------------------------------------------------------------
create table if not exists public.danos_diagrama (
  id            uuid primary key default gen_random_uuid(),
  inventario_id uuid not null references public.inventarios_ingreso(id) on delete cascade,
  posicion_x    numeric(5,2) not null check (posicion_x between 0 and 100),
  posicion_y    numeric(5,2) not null check (posicion_y between 0 and 100),
  vista         text not null check (vista in ('frontal','lateral_izquierdo','lateral_derecho','trasera','superior')),
  tipo_dano     text not null default 'golpe' check (tipo_dano in ('golpe','rayon','abolladura','rotura','faltante','oxido')),
  descripcion   text,
  created_at    timestamptz not null default now()
);
create index if not exists danos_diagrama_inventario_idx on public.danos_diagrama(inventario_id);

-- 5. fotografias_unidad --------------------------------------------------------
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

-- 6. etiquetas_qr_rastreo ------------------------------------------------------
-- Una unidad puede llevar varios QR con el mismo número de cono (uno por taller:
-- mecánica, laminado…). Lo único que no se permite es repetir cono + taller
-- mientras el QR siga colocado.
create table if not exists public.etiquetas_qr_rastreo (
  id                      uuid primary key default gen_random_uuid(),
  unidad_id               uuid not null references public.unidades(id) on delete cascade,
  codigo_qr               text not null,
  taller                  text not null,
  ubicacion_rack          text,
  estado                  text not null default 'Colocada' check (estado in ('Pendiente','Colocada','Retirada')),
  fecha_colocacion        timestamptz,
  fecha_retiro_programada date,
  fecha_retiro            timestamptz,
  retirado_por            text,
  created_at              timestamptz not null default now()
);
create index if not exists etiquetas_qr_unidad_idx on public.etiquetas_qr_rastreo(unidad_id);
create unique index if not exists etiquetas_qr_cono_taller_activo_idx
  on public.etiquetas_qr_rastreo(codigo_qr, taller) where estado <> 'Retirada';

-- =============================================================================
-- Seguridad (RLS): solo usuarios con sesión iniciada leen y escriben.
-- La app usa la anon key en el navegador, así que esto es lo que protege los datos.
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array['unidades','historial_estados','inventarios_ingreso','danos_diagrama','fotografias_unidad','etiquetas_qr_rastreo'] loop
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
