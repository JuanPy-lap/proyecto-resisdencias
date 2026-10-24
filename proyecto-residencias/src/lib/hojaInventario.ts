import type { DatosHoja, EstadoParte, ParteInventario } from '@/types/supabase';

// Catálogo de la hoja "INVENTARIO FÍSICO ESTADO UNIDAD" del Departamento
// Operativo RSAD, en el mismo orden y con las mismas tres columnas. El
// formulario y el Excel se generan a partir de aquí: para cambiar la hoja,
// solo se edita este archivo.

export type ItemHoja = { clave: string; etiqueta: string };
/** Grupo de la hoja. `titulo: null` = renglones que continúan el grupo anterior. `sino` = se marca Sí/No en vez de Cant/Estado. */
export type GrupoHoja = { titulo: string | null; sino?: boolean; items: ItemHoja[] };

function slug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// La clave lleva el prefijo del grupo porque hay conceptos repetidos
// (p. ej. "Puertas de cabina" en ambos costados).
function grupo(prefijo: string, titulo: string | null, etiquetas: string[], sino = false): GrupoHoja {
  return { titulo, sino, items: etiquetas.map((etiqueta) => ({ clave: `${prefijo}.${slug(etiqueta)}`, etiqueta })) };
}

export const COLUMNAS_HOJA: GrupoHoja[][] = [
  [
    grupo('frente_ext', 'FRENTE EXTERIOR', ['Cofre', 'Emblemas', 'Parrilla de cofre', 'Defensa delantera', 'Faro neblinero', 'Unidades de luz', 'Unidades luz LEDS']),
    grupo('motor', 'INTERIOR DE MOTOR', ['Baterías', 'Paq. radiadores', 'Módulo motor', 'Actuadores de motor', 'Ventilador', 'Caja dirección', 'Distribución motor', 'Compresor de A/C']),
    grupo('frente_sup', 'FRENTE SUPERIOR', ['Cristal parabrisas', 'Visera de cabina', 'Sistema limpiabrisas', 'Antena radio', 'Engomados cristal parabrisas']),
    grupo('costado_izq', 'COSTADO IZQUIERDO', ['Puertas de cabina', 'Cerraduras de puertas', 'Ventanas camarote', 'Antisonoras de cabina', 'Faros reverseros', 'Cubretanques']),
    grupo('estribos', 'ESTRIBOS', ['Derechos', 'Izquierdos']),
    grupo('espalda', 'ESPALDA DE CABINA', ['Placa en espalda', 'Cristal medallón', 'Stops frenos', 'Alerones de cabina RH', 'Alerón de cabina LH']),
  ],
  [
    grupo('tanques', null, ['Tanque diésel RH delantero', 'Tanque diésel RH trasero', 'Tanque diésel LH delantero', 'Tanque diésel LH trasero', 'Tanque urea']),
    grupo('costado_der', 'COSTADO DERECHO', ['Puertas de cabina', 'Cerraduras de puertas', 'Ventanas de camarote', 'Antisonoras de cabina', 'Faros reverseros', 'Cubretanques']),
    grupo('llaves', 'LLAVES', ['Puertas cabina', 'Puertas camarote', 'Encendido']),
    grupo('interior', 'INTERIOR DE VEHÍCULO', [
      'CV (Radio del camión)', 'Estéreo audio', 'Consoletas superior cabina', 'Consoletas camarote', 'Elevadores de puerta RH',
      'Elevadores de puerta LH', 'Controles de elevadores RH', 'Controles de elevadores LH', 'Molduras de tablero', 'Asiento piloto',
      'Asiento copiloto', 'Tapizado de asientos', 'Controles de A/C', 'Tablero de instrumentos', 'Colchón camarote', 'Volante de dirección',
    ]),
    grupo('tablero', 'TABLERO DE CONTROLES', ['Switch ignición', 'Interruptor luces delanteras', 'Interruptor luces parqueo', 'Palanca de direccionales', 'Clatson']),
  ],
  [
    grupo('indicadores', null, [
      'Válvulas de estacionamiento', 'Tacómetro', 'Encendedor cigarrillos', 'Velocímetro', 'Indicador de diésel',
      'Medidor de temperatura', 'Medidor de aceite', 'Indicador temperatura diferenciales',
    ]),
    grupo('herramientas', 'HERRAMIENTAS', [
      'Gato', 'Crucetas', 'Pinzas', 'Palancas', 'Destornillador', 'Estrellas', 'Llaves fijas', 'Llave de expansión', 'Mixtas',
      'Pinzas perras', 'Tornillería', 'Filtros aceites', 'Lámpara (pilas o conexión)', 'Mangueras combustible',
    ]),
    grupo('senales', 'SEÑALES DE ADVERTENCIA DE PELIGRO', ['Triángulos', 'Lámparas de luz intermitente', 'Bloques de frenado', 'Extintor']),
    grupo('otros', 'OTROS', ['Equipo especial adaptación', 'Ropa personal', 'Utensilios de cocina', 'Otros (describe en observación)', 'Gancho de tirón'], true),
  ],
];

export const GRUPOS_HOJA = COLUMNAS_HOJA.flat();
export const ITEMS_HOJA = GRUPOS_HOJA.flatMap((g) => g.items.map((i) => ({ ...i, sino: !!g.sino })));

export const ESTADOS_PARTE: { valor: EstadoParte; etiqueta: string; clase: string }[] = [
  { valor: 'B', etiqueta: 'Bueno', clase: 'bg-emerald-600 text-white' },
  { valor: 'R', etiqueta: 'Regular', clase: 'bg-amber-500 text-slate-950' },
  { valor: 'M', etiqueta: 'Malo', clase: 'bg-red-600 text-white' },
];

/** Campos del encabezado amarillo de la hoja, en orden. */
export const CAMPOS_ENCABEZADO: { clave: keyof DatosHoja; etiqueta: string }[] = [
  { clave: 'cia', etiqueta: 'CIA' },
  { clave: 'marca', etiqueta: 'Marca' },
  { clave: 'tipo', etiqueta: 'Tipo' },
  { clave: 'modelo', etiqueta: 'Modelo' },
  { clave: 'placas', etiqueta: 'Placas' },
  { clave: 'color', etiqueta: 'Color' },
];

/** Resumen para el expediente: partes en estado malo/regular y faltantes (sin marcar). */
export function resumenHoja(checklist: Record<string, ParteInventario> | null | undefined) {
  const c = checklist ?? {};
  const conEstado = (e: EstadoParte) => ITEMS_HOJA.filter((i) => !i.sino && c[i.clave]?.estado === e);
  return {
    buenas: conEstado('B').length,
    regulares: conEstado('R'),
    malas: conEstado('M'),
    sinMarcar: ITEMS_HOJA.filter((i) => !i.sino && !c[i.clave]?.estado),
  };
}
