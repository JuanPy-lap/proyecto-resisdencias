import type { EstadoQR, EstadoUnidad, EtapaFoto, EtiquetaQRRastreo, VistaDiagrama } from '@/types/supabase';

// Catálogos del dominio con su presentación (etiqueta y clases de Tailwind).
// Las clases van completas como literales para que Tailwind las detecte.

/** Fases del taller en orden. Una unidad solo avanza a la siguiente; nunca regresa. */
export const ESTADOS_UNIDAD: { valor: EstadoUnidad; descripcion: string; clase: string; punto: string }[] = [
  { valor: 'Ingreso', descripcion: 'Recepción, inventario y fotos de ingreso', clase: 'bg-sky-50 text-sky-700 ring-sky-200', punto: 'bg-sky-500' },
  { valor: 'Espera de Liberación', descripcion: 'Esperando autorización de la aseguradora', clase: 'bg-violet-50 text-violet-700 ring-violet-200', punto: 'bg-violet-500' },
  { valor: 'Proceso', descripcion: 'Espera de piezas, reparación y fotos de proceso', clase: 'bg-amber-50 text-amber-800 ring-amber-200', punto: 'bg-amber-500' },
  { valor: 'Control de Calidad', descripcion: 'Revisión final, fotos de terminado y retiro de QR', clase: 'bg-indigo-50 text-indigo-700 ring-indigo-200', punto: 'bg-indigo-500' },
  { valor: 'Entrega', descripcion: 'Unidad entregada al cliente', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200', punto: 'bg-emerald-500' },
];

/** Fases en las que la unidad ya no debería tener etiquetas QR colocadas. */
export const ESTADOS_SALIDA: EstadoUnidad[] = ['Control de Calidad', 'Entrega'];

export function indiceEstado(estado: EstadoUnidad) {
  return ESTADOS_UNIDAD.findIndex((e) => e.valor === estado);
}

/** Fase que sigue (null si ya está en Entrega). */
export function siguienteEstado(estado: EstadoUnidad): EstadoUnidad | null {
  return ESTADOS_UNIDAD[indiceEstado(estado) + 1]?.valor ?? null;
}

/**
 * Etapas de fotos. `fases` indica a qué unidades se les pueden tomar fotos de
 * esa etapa (las de ingreso solo a unidades en Ingreso, etc.).
 */
export const ETAPAS_FOTO: { valor: EtapaFoto; descripcion: string; clase: string; fases: EstadoUnidad[] }[] = [
  { valor: 'Ingreso', descripcion: 'Cómo llega la unidad al taller', clase: 'bg-sky-50 text-sky-700 ring-sky-200', fases: ['Ingreso'] },
  { valor: 'Proceso', descripcion: 'Avance de la reparación', clase: 'bg-amber-50 text-amber-800 ring-amber-200', fases: ['Proceso'] },
  { valor: 'Terminado', descripcion: 'Unidad reparada, lista para entrega', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200', fases: ['Proceso', 'Control de Calidad'] },
];

export const ESTADOS_QR: { valor: EstadoQR; clase: string }[] = [
  { valor: 'Pendiente', clase: 'bg-slate-100 text-slate-700 ring-slate-200' },
  { valor: 'Colocada', clase: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { valor: 'Retirada', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
];

/** Las cinco vistas del tractocamión, en el orden de la hoja de inventario. */
export const VISTAS_HOJA: { valor: VistaDiagrama; etiqueta: string }[] = [
  { valor: 'lateral_izquierdo', etiqueta: 'Lado izquierdo' },
  { valor: 'lateral_derecho', etiqueta: 'Lado derecho' },
  { valor: 'superior', etiqueta: 'Arriba' },
  { valor: 'frontal', etiqueta: 'Frente' },
  { valor: 'trasera', etiqueta: 'Atrás' },
];

export const NIVELES_COMBUSTIBLE = [
  { valor: 0, etiqueta: 'Vacío' },
  { valor: 25, etiqueta: '¼' },
  { valor: 50, etiqueta: '½' },
  { valor: 75, etiqueta: '¾' },
  { valor: 100, etiqueta: 'Lleno' },
];

export function etiquetaCombustible(valor: number) {
  return NIVELES_COMBUSTIBLE.find((n) => n.valor === valor)?.etiqueta ?? `${valor}%`;
}

/** Áreas del taller; se usan en las etiquetas QR y en el mapa. */
export const TALLERES: { nombre: string; clase: string; borde: string }[] = [
  { nombre: 'Mecánica', clase: 'bg-amber-50', borde: 'border-amber-300 text-amber-800' },
  { nombre: 'Laminado', clase: 'bg-violet-50', borde: 'border-violet-300 text-violet-800' },
  { nombre: 'Pintura', clase: 'bg-emerald-50', borde: 'border-emerald-300 text-emerald-800' },
  { nombre: 'Recepción', clase: 'bg-sky-50', borde: 'border-sky-300 text-sky-800' },
  { nombre: 'Almacén', clase: 'bg-slate-100', borde: 'border-slate-300 text-slate-700' },
];

export function claseEstadoUnidad(estado: EstadoUnidad) {
  return ESTADOS_UNIDAD.find((e) => e.valor === estado)?.clase ?? 'bg-slate-100 text-slate-600 ring-slate-200';
}

/** Fecha de hoy como "YYYY-MM-DD" en hora local (para inputs type="date"). */
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function aFecha(iso: string) {
  // Las columnas `date` llegan como "2026-10-21": se fuerzan a medianoche local
  // para que no se recorran un día por la zona horaria.
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

export function formatearFecha(iso: string | null | undefined, conHora = false) {
  if (!iso) return '—';
  return aFecha(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Días desde una fecha ISO hasta hoy (negativo si está en el futuro). */
export function diasDesde(iso: string) {
  const hoy = aFecha(hoyISO());
  const fecha = aFecha(iso.slice(0, 10));
  return Math.round((hoy.getTime() - fecha.getTime()) / 86_400_000);
}

/** Situación del retiro de un QR colocado según su fecha programada. */
export function situacionRetiro(q: Pick<EtiquetaQRRastreo, 'estado' | 'fecha_retiro_programada'>) {
  if (q.estado !== 'Colocada' || !q.fecha_retiro_programada) return null;
  const dias = -diasDesde(q.fecha_retiro_programada); // días que faltan
  if (dias < 0) return { tipo: 'vencido' as const, texto: `Retiro vencido hace ${-dias} d`, clase: 'bg-red-100 text-red-700 ring-red-200' };
  if (dias === 0) return { tipo: 'hoy' as const, texto: 'Retirar hoy', clase: 'bg-orange-100 text-orange-700 ring-orange-200' };
  if (dias <= 2) return { tipo: 'proximo' as const, texto: `Retirar en ${dias} d`, clase: 'bg-amber-100 text-amber-800 ring-amber-200' };
  return { tipo: 'ok' as const, texto: `Retirar en ${dias} d`, clase: 'bg-slate-100 text-slate-600 ring-slate-200' };
}
