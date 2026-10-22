import type { EstadoQR, EstadoUnidad, EtapaFoto, TipoDano, VistaDiagrama } from '@/types/supabase';

// Catálogos del dominio con su presentación (etiqueta y clases de Tailwind).
// Las clases van completas como literales para que Tailwind las detecte.

export const ESTADOS_UNIDAD: { valor: EstadoUnidad; clase: string; punto: string }[] = [
  { valor: 'Ingreso', clase: 'bg-sky-50 text-sky-700 ring-sky-200', punto: 'bg-sky-500' },
  { valor: 'En Diagnóstico', clase: 'bg-violet-50 text-violet-700 ring-violet-200', punto: 'bg-violet-500' },
  { valor: 'En Proceso', clase: 'bg-amber-50 text-amber-800 ring-amber-200', punto: 'bg-amber-500' },
  { valor: 'Control de Calidad', clase: 'bg-indigo-50 text-indigo-700 ring-indigo-200', punto: 'bg-indigo-500' },
  { valor: 'Liberada', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200', punto: 'bg-emerald-500' },
  { valor: 'Entregada', clase: 'bg-slate-100 text-slate-600 ring-slate-200', punto: 'bg-slate-400' },
];

/** Estados en los que la unidad ya no debería tener etiquetas QR colocadas. */
export const ESTADOS_SALIDA: EstadoUnidad[] = ['Control de Calidad', 'Liberada', 'Entregada'];

export const ETAPAS_FOTO: { valor: EtapaFoto; descripcion: string; clase: string }[] = [
  { valor: 'Ingreso', descripcion: 'Estado en que llega la unidad', clase: 'bg-sky-50 text-sky-700 ring-sky-200' },
  { valor: 'Proceso', descripcion: 'Avance de la reparación', clase: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { valor: 'Terminado', descripcion: 'Evidencia de entrega', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
];

export const SECCIONES_FOTO = [
  'General',
  'Frontal',
  'Lateral izquierdo',
  'Lateral derecho',
  'Trasera',
  'Cabina interior',
  'Chasis',
  'Motor',
  'Tablero / Odómetro',
];

export const ESTADOS_QR: { valor: EstadoQR; clase: string }[] = [
  { valor: 'Pendiente', clase: 'bg-slate-100 text-slate-700 ring-slate-200' },
  { valor: 'Colocada', clase: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { valor: 'Retirada', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
];

export const VISTAS_DIAGRAMA: { valor: VistaDiagrama; etiqueta: string }[] = [
  { valor: 'lateral_izquierdo', etiqueta: 'Lateral izq.' },
  { valor: 'lateral_derecho', etiqueta: 'Lateral der.' },
  { valor: 'frontal', etiqueta: 'Frontal' },
  { valor: 'trasera', etiqueta: 'Trasera' },
  { valor: 'superior', etiqueta: 'Superior' },
];

export const TIPOS_DANO: { valor: TipoDano; etiqueta: string; color: string; clase: string }[] = [
  { valor: 'golpe', etiqueta: 'Golpe', color: '#dc2626', clase: 'bg-red-50 text-red-700 ring-red-200' },
  { valor: 'abolladura', etiqueta: 'Abolladura', color: '#ea580c', clase: 'bg-orange-50 text-orange-700 ring-orange-200' },
  { valor: 'rayon', etiqueta: 'Rayón', color: '#ca8a04', clase: 'bg-yellow-50 text-yellow-800 ring-yellow-200' },
  { valor: 'rotura', etiqueta: 'Rotura', color: '#9333ea', clase: 'bg-purple-50 text-purple-700 ring-purple-200' },
  { valor: 'faltante', etiqueta: 'Faltante', color: '#2563eb', clase: 'bg-blue-50 text-blue-700 ring-blue-200' },
  { valor: 'oxido', etiqueta: 'Óxido', color: '#78350f', clase: 'bg-stone-100 text-stone-700 ring-stone-300' },
];

/** Áreas del taller; se usan en las etiquetas QR y en el mapa. */
export const TALLERES: { nombre: string; clase: string; borde: string }[] = [
  { nombre: 'Recepción', clase: 'bg-sky-50', borde: 'border-sky-300 text-sky-800' },
  { nombre: 'Mecánica', clase: 'bg-amber-50', borde: 'border-amber-300 text-amber-800' },
  { nombre: 'Laminado', clase: 'bg-violet-50', borde: 'border-violet-300 text-violet-800' },
  { nombre: 'Pintura', clase: 'bg-emerald-50', borde: 'border-emerald-300 text-emerald-800' },
  { nombre: 'Almacén', clase: 'bg-slate-100', borde: 'border-slate-300 text-slate-700' },
];

export function claseEstadoUnidad(estado: EstadoUnidad) {
  return ESTADOS_UNIDAD.find((e) => e.valor === estado)?.clase ?? '';
}

export function infoTipoDano(tipo: TipoDano) {
  return TIPOS_DANO.find((t) => t.valor === tipo) ?? TIPOS_DANO[0];
}

export function formatearFecha(iso: string | null | undefined, conHora = false) {
  if (!iso) return '—';
  // Las columnas `date` llegan como "2026-10-21": se fuerzan a medianoche local
  // para que no se recorran un día por la zona horaria.
  const fecha = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Días desde una fecha ISO hasta hoy (negativo si está en el futuro). */
export function diasDesde(iso: string) {
  const fecha = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Math.floor((Date.now() - fecha.getTime()) / 86_400_000);
}
