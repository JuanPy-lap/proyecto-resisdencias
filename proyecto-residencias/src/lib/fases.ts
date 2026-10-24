import type { EstadoUnidad, EtapaFoto, Unidad } from '@/types/supabase';

/** Conteos de lo que ya se capturó para una unidad. */
export type ResumenUnidad = {
  fotos: Record<EtapaFoto, number>;
  inventarios: number;
  qrColocados: number;
  qrTotal: number;
};

export type Tarea = {
  clave: string;
  titulo: string;
  detalle: string;
  hecha: boolean;
  /** Si es obligatoria, bloquea el avance a la siguiente fase. */
  obligatoria: boolean;
  href: string;
  accion: string;
};

export const RESUMEN_VACIO: ResumenUnidad = {
  fotos: { Ingreso: 0, Proceso: 0, Terminado: 0 },
  inventarios: 0,
  qrColocados: 0,
  qrTotal: 0,
};

export function resumir(
  fotos: { etapa: EtapaFoto }[],
  inventarios: unknown[],
  etiquetas: { estado: string }[]
): ResumenUnidad {
  const conteo = { Ingreso: 0, Proceso: 0, Terminado: 0 };
  fotos.forEach((f) => conteo[f.etapa]++);
  return {
    fotos: conteo,
    inventarios: inventarios.length,
    qrColocados: etiquetas.filter((q) => q.estado === 'Colocada').length,
    qrTotal: etiquetas.length,
  };
}

/** Lo que hay que hacer en la fase actual de la unidad, en orden. */
export function tareasDeFase(unidad: Pick<Unidad, 'id' | 'estado_unidad'>, r: ResumenUnidad): Tarea[] {
  const id = unidad.id;
  const fotos = (etapa: EtapaFoto, titulo: string): Tarea => ({
    clave: `fotos-${etapa}`,
    titulo,
    detalle: r.fotos[etapa] ? `${r.fotos[etapa]} foto(s) tomadas` : 'Aún no hay fotos',
    hecha: r.fotos[etapa] > 0,
    obligatoria: true,
    href: `/fotos?etapa=${etapa}&unidad=${id}`,
    accion: r.fotos[etapa] ? 'Agregar fotos' : 'Tomar fotos',
  });

  const porFase: Record<EstadoUnidad, Tarea[]> = {
    Ingreso: [
      {
        clave: 'inventario',
        titulo: 'Inventario de ingreso',
        detalle: r.inventarios ? 'Capturado' : 'Llenar la hoja de inventario',
        hecha: r.inventarios > 0,
        obligatoria: true,
        href: `/inventario?unidad=${id}`,
        accion: 'Capturar inventario',
      },
      fotos('Ingreso', 'Fotos de ingreso'),
    ],
    'Espera de Liberación': [],
    Proceso: [
      {
        clave: 'qr',
        titulo: 'Colocar QR de rastreo',
        detalle: r.qrColocados ? `${r.qrColocados} QR colocado(s)` : 'Uno por taller (mecánica, laminado…)',
        hecha: r.qrColocados > 0,
        obligatoria: false,
        href: `/qr-supervision?unidad=${id}`,
        accion: 'Colocar QR',
      },
      fotos('Proceso', 'Fotos de proceso'),
    ],
    'Control de Calidad': [
      fotos('Terminado', 'Fotos de terminado'),
      {
        clave: 'retiro-qr',
        titulo: 'Retirar todos los QR',
        detalle: r.qrColocados ? `Faltan ${r.qrColocados} por retirar` : 'Sin QR colocados',
        hecha: r.qrColocados === 0,
        obligatoria: true,
        href: `/qr-supervision?unidad=${id}`,
        accion: 'Retirar QR',
      },
    ],
    Entrega: [],
  };

  return porFase[unidad.estado_unidad] ?? [];
}

/** Tareas obligatorias que faltan para poder avanzar de fase. */
export function pendientesParaAvanzar(tareas: Tarea[]) {
  return tareas.filter((t) => t.obligatoria && !t.hecha);
}
