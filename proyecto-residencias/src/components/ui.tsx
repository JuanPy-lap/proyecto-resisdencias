'use client';

import type { ComponentType, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Database, Loader2, RefreshCw, X } from 'lucide-react';
import { supabaseConfigurado } from '@/lib/supabase';

type Icono = ComponentType<{ className?: string }>;

// Clases reutilizables para formularios y botones.
export const claseInput =
  'w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 disabled:text-slate-400';
export const claseBotonPrimario =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';
export const claseBotonAcento =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';
export const claseBotonSecundario =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

export function Encabezado({
  icono: IconoEnc,
  seccion,
  titulo,
  descripcion,
  acciones,
}: {
  icono: Icono;
  seccion: string;
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="hidden rounded-2xl bg-slate-900 p-3 text-amber-400 shadow-lg shadow-slate-900/20 sm:block">
          <IconoEnc className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">{seccion}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{titulo}</h1>
          {descripcion && <p className="mt-1 max-w-2xl text-sm text-slate-500">{descripcion}</p>}
        </div>
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}

export function Tarjeta({
  titulo,
  icono: IconoTarjeta,
  acciones,
  children,
  className = '',
  sinPadding = false,
}: {
  titulo?: string;
  icono?: Icono;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
  sinPadding?: boolean;
}) {
  return (
    <section className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 ${className}`}>
      {titulo && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            {IconoTarjeta && <IconoTarjeta className="h-5 w-5 text-slate-400" />}
            {titulo}
          </h2>
          {acciones}
        </div>
      )}
      <div className={sinPadding ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

export function Estadistica({
  etiqueta,
  valor,
  detalle,
  icono: IconoEst,
  tono = 'slate',
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: string;
  icono: Icono;
  tono?: 'slate' | 'amber' | 'red' | 'emerald' | 'sky';
}) {
  const tonos = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{etiqueta}</p>
        <span className={`rounded-xl p-2 ${tonos[tono]}`}>
          <IconoEst className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 tabular-nums">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

export function Insignia({ children, clase }: { children: ReactNode; clase: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${clase}`}>
      {children}
    </span>
  );
}

export function Vacio({ icono: IconoVacio, titulo, texto, accion }: { icono: Icono; titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center">
      <div className="rounded-2xl bg-slate-100 p-3 text-slate-400">
        <IconoVacio className="h-8 w-8" />
      </div>
      <p className="mt-3 font-semibold text-slate-700">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-slate-500">{texto}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
      {texto}
    </div>
  );
}

export function ErrorCarga({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {mensaje}
      </span>
      {reintentar && (
        <button onClick={reintentar} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      )}
    </div>
  );
}

/** Toast flotante para confirmar o reportar errores de una acción. */
export function Aviso({ aviso, cerrar }: { aviso: { tipo: 'exito' | 'error'; texto: string } | null; cerrar: () => void }) {
  if (!aviso) return null;
  const exito = aviso.tipo === 'exito';
  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6">
      <div
        role="status"
        className={`animate-entrada flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl ring-1 ${
          exito ? 'bg-slate-900 text-white ring-slate-800' : 'bg-red-600 text-white ring-red-700'
        }`}
      >
        {exito ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
        <span className="flex-1">{aviso.texto}</span>
        <button onClick={cerrar} aria-label="Cerrar aviso" className="opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Se muestra en lugar del contenido cuando falta .env.local. */
export function AvisoConfiguracion() {
  if (supabaseConfigurado) return null;
  return (
    <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200">
      <p className="flex items-center gap-2 font-bold">
        <Database className="h-5 w-5" /> Falta conectar Supabase
      </p>
      <p className="mt-2">
        Copia <code className="rounded bg-amber-100 px-1">.env.example</code> como{' '}
        <code className="rounded bg-amber-100 px-1">.env.local</code>, coloca la URL y la anon key de tu proyecto y
        reinicia <code className="rounded bg-amber-100 px-1">npm run dev</code>.
      </p>
    </div>
  );
}

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-slate-400">{ayuda}</span>}
    </label>
  );
}

export function Pagina({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">{children}</div>;
}
