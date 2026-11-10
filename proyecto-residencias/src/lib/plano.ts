import type { EtiquetaQRConUnidad } from '@/types/supabase';
import { ESTADOS_SALIDA, situacionRetiro } from '@/lib/constantes';

// =============================================================================
// Plano de la empresa: posición real de cada taller, trazada sobre la vista
// aérea del patio. Las coordenadas están en un lienzo de 1000 x 660 (mismo
// viewBox que usa <PlanoTaller />), así el plano escala a cualquier pantalla.
//
// Para reacomodar un taller o agregar uno nuevo solo se edita esta lista.
// `alias` son las formas en que la gente lo ha escrito en ubicacion_rack
// (sin acentos ni la palabra "TALLER"); con eso los QR viejos también se ubican.
// =============================================================================

export const ANCHO_PLANO = 1000;
export const ALTO_PLANO = 660;

export type ZonaPlano = 'Nave norte' | 'Ala poniente' | 'Nave sur';
export type TipoArea = 'taller' | 'lavado' | 'pintura';

export type AreaPlano = {
  id: string;
  /** Nombre completo; es lo que se guarda en ubicacion_rack (en mayúsculas). */
  nombre: string;
  /** Texto corto que se dibuja dentro del plano. */
  corto: string;
  tipo: TipoArea;
  zona: ZonaPlano;
  x: number;
  y: number;
  w: number;
  h: number;
  alias?: string[];
  /** Nombre leído del croquis que falta confirmar con la empresa. */
  porConfirmar?: boolean;
};

const N = 'Nave norte';
const P = 'Ala poniente';
const S = 'Nave sur';

export const AREAS_PLANO: AreaPlano[] = [
  // --- Nave norte (de izquierda a derecha) ----------------------------------
  { id: 'zempoalteca', nombre: 'Taller Zempoalteca', corto: 'Zempoalteca', tipo: 'taller', zona: N, x: 28, y: 14, w: 104, h: 106, alias: ['ZEMPOAL'] },
  { id: 'damian', nombre: 'Taller Damián', corto: 'Damián', tipo: 'taller', zona: N, x: 132, y: 14, w: 116, h: 106 },
  { id: 'bolanos', nombre: 'Taller Jorge Bolaños', corto: 'Bolaños', tipo: 'taller', zona: N, x: 248, y: 14, w: 117, h: 106, alias: ['BOLANOS', 'JORGE'] },
  { id: 'aldo', nombre: 'Taller Aldo', corto: 'Aldo', tipo: 'taller', zona: N, x: 365, y: 14, w: 90, h: 106 },
  { id: 'lavado-2', nombre: 'Lavado 2', corto: 'Lavado 2', tipo: 'lavado', zona: N, x: 455, y: 14, w: 36, h: 106 },
  { id: 'lavado-1', nombre: 'Lavado 1', corto: 'Lavado 1', tipo: 'lavado', zona: N, x: 491, y: 14, w: 76, h: 106 },
  { id: 'servi', nombre: 'Taller Servi', corto: 'Servi', tipo: 'taller', zona: N, x: 567, y: 14, w: 73, h: 106 },
  { id: 'elihud', nombre: 'Taller Elihud', corto: 'Elihud', tipo: 'taller', zona: N, x: 640, y: 14, w: 60, h: 106 },
  { id: 'raulillo', nombre: 'Taller Raulillo', corto: 'Raulillo', tipo: 'taller', zona: N, x: 700, y: 14, w: 65, h: 106 },
  { id: 'luperco', nombre: 'Taller Luperco', corto: 'Luperco', tipo: 'taller', zona: N, x: 765, y: 14, w: 73, h: 70, porConfirmar: true },
  { id: 'hugo-zamora', nombre: 'Taller Hugo Zamora', corto: 'HZ', tipo: 'taller', zona: N, x: 838, y: 14, w: 73, h: 70, alias: ['HZ', 'HUGO'] },
  { id: 'mello', nombre: 'Taller Mello', corto: 'Mello', tipo: 'taller', zona: N, x: 911, y: 14, w: 74, h: 70, porConfirmar: true },

  // --- Ala poniente (de arriba hacia abajo) ---------------------------------
  { id: 'pinturas', nombre: 'Pinturas', corto: 'Pinturas', tipo: 'pintura', zona: P, x: 28, y: 166, w: 90, h: 44, alias: ['PINTURA'] },
  { id: 'poniente-sn', nombre: 'Taller poniente (sin nombre)', corto: 'Sin nombre', tipo: 'taller', zona: P, x: 28, y: 210, w: 90, h: 54 },
  { id: 'chauditos', nombre: 'Taller Chauditos', corto: 'Chauditos', tipo: 'taller', zona: P, x: 28, y: 264, w: 90, h: 58, porConfirmar: true },
  { id: 'mimoso', nombre: 'Taller Mimoso', corto: 'Mimoso', tipo: 'taller', zona: P, x: 28, y: 322, w: 90, h: 51 },
  { id: 'rodo', nombre: 'Taller Rodo', corto: 'Rodo', tipo: 'taller', zona: P, x: 28, y: 373, w: 90, h: 55 },
  { id: 'aleriano', nombre: 'Taller Aleriano', corto: 'Aleriano', tipo: 'taller', zona: P, x: 28, y: 428, w: 90, h: 52, porConfirmar: true },
  { id: 'carrillo', nombre: 'Taller Carrillo', corto: 'Carrillo', tipo: 'taller', zona: P, x: 28, y: 480, w: 90, h: 45 },
  { id: 'armando', nombre: 'Taller Armando Martínez', corto: 'A. Martínez', tipo: 'taller', zona: P, x: 28, y: 525, w: 90, h: 45, alias: ['ARMANDO'] },
  { id: 'cerva', nombre: 'Cerva', corto: 'Cerva', tipo: 'taller', zona: P, x: 28, y: 570, w: 132, h: 76 },

  // --- Nave sur (de izquierda a derecha) ------------------------------------
  { id: 'casillas', nombre: 'Taller Casillas', corto: 'Casillas', tipo: 'taller', zona: S, x: 160, y: 570, w: 42, h: 76 },
  { id: 'ever', nombre: 'Taller Ever', corto: 'Ever', tipo: 'taller', zona: S, x: 202, y: 570, w: 55, h: 76 },
  { id: 'sur-sn', nombre: 'Taller sur (sin nombre)', corto: 'Sin nombre', tipo: 'taller', zona: S, x: 257, y: 570, w: 46, h: 76 },
  { id: 'avina', nombre: 'Taller Los Aviña', corto: 'Aviña', tipo: 'taller', zona: S, x: 303, y: 570, w: 45, h: 76, alias: ['AVILA'] },
  { id: 'maquito', nombre: 'Taller Maquito', corto: 'Maquito', tipo: 'taller', zona: S, x: 348, y: 570, w: 30, h: 76 },
  { id: 'felix', nombre: 'Taller Félix', corto: 'Félix', tipo: 'taller', zona: S, x: 378, y: 570, w: 32, h: 76, alias: ['FELI'], porConfirmar: true },
  { id: 'david', nombre: 'Taller David', corto: 'David', tipo: 'taller', zona: S, x: 410, y: 570, w: 77, h: 76 },
  { id: 'alonso', nombre: 'Taller Alonso', corto: 'Alonso', tipo: 'taller', zona: S, x: 487, y: 570, w: 90, h: 76 },
];

export const ZONAS_PLANO: ZonaPlano[] = [N, P, S];

// -----------------------------------------------------------------------------
// Relacionar el texto de ubicacion_rack con un área del plano
// -----------------------------------------------------------------------------

const PALABRAS_VACIAS = new Set(['TALLER', 'LOS', 'LAS', 'EL', 'LA', 'DE', 'DEL', 'SIN', 'NOMBRE']);

/** "Taller Los Aviña" -> "AVINA"; "aLONSO" -> "ALONSO". */
export function normalizarUbicacion(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(' ')
    .filter((p) => p && !PALABRAS_VACIAS.has(p))
    .join(' ');
}

const CLAVES = AREAS_PLANO.map((a) => ({
  area: a,
  claves: [a.nombre, ...(a.alias ?? [])].map(normalizarUbicacion).filter((c) => c.length >= 2),
}));

/** Área del plano a la que corresponde una ubicación escrita (null si no se reconoce). */
export function areaDeUbicacion(ubicacion: string | null | undefined): AreaPlano | null {
  if (!ubicacion) return null;
  const buscado = normalizarUbicacion(ubicacion);
  if (!buscado) return null;
  // 1) Coincidencia exacta con nombre o alias.
  const exacta = CLAVES.find(({ claves }) => claves.includes(buscado));
  if (exacta) return exacta.area;
  // 2) Coincidencia parcial ("HUGO" dentro de "HUGO ZAMORA", "ZEMPOALTECA" contiene "ZEMPOAL").
  if (buscado.length < 3) return null;
  const parcial = CLAVES.find(({ claves }) => claves.some((c) => c.length >= 3 && (c.includes(buscado) || buscado.includes(c))));
  return parcial?.area ?? null;
}

/** Nombre bonito para mostrar una ubicación guardada (o el texto tal cual si no está en el plano). */
export function nombreUbicacion(ubicacion: string | null | undefined) {
  if (!ubicacion) return null;
  return areaDeUbicacion(ubicacion)?.nombre ?? ubicacion;
}

/** Valor que se guarda en ubicacion_rack al elegir un área del plano. */
export function valorUbicacion(area: AreaPlano) {
  return area.nombre.toUpperCase();
}

// -----------------------------------------------------------------------------
// Semáforo de cada QR y de cada área
// -----------------------------------------------------------------------------

export type NivelAlerta = 'ok' | 'proximo' | 'critico';

export const PESO_ALERTA: Record<NivelAlerta, number> = { ok: 0, proximo: 1, critico: 2 };

/**
 * critico: la unidad ya va de salida (Control de Calidad / Entrega) con el QR puesto,
 *          o el retiro programado es hoy o ya venció.
 * proximo: faltan 1-2 días para retirarlo.
 */
export function nivelAlerta(q: EtiquetaQRConUnidad): NivelAlerta {
  const tipo = situacionRetiro(q)?.tipo;
  if ((q.unidades && ESTADOS_SALIDA.includes(q.unidades.estado_unidad)) || tipo === 'vencido' || tipo === 'hoy') return 'critico';
  if (tipo === 'proximo') return 'proximo';
  return 'ok';
}

export const ESTILO_ALERTA: Record<NivelAlerta, { etiqueta: string; color: string; insignia: string }> = {
  ok: { etiqueta: 'En tiempo', color: '#10b981', insignia: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  proximo: { etiqueta: 'Retiro próximo', color: '#f59e0b', insignia: 'bg-amber-50 text-amber-800 ring-amber-200' },
  critico: { etiqueta: 'Retirar ya', color: '#ef4444', insignia: 'bg-red-50 text-red-700 ring-red-200' },
};
