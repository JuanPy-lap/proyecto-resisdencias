'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ClipboardList, Truck } from 'lucide-react';
import { getUnidades } from '@/services/api';
import { useDatos } from '@/lib/hooks';
import type { Unidad } from '@/types/supabase';
import HojaInventario from '@/components/HojaInventario';
import { AvisoConfiguracion, Cargando, Encabezado, ErrorCarga, Pagina, Tarjeta, Vacio, claseBotonAcento } from '@/components/ui';

/** Si llegan sin unidad, se elige entre las que están en Ingreso. */
function ElegirUnidad({ unidades }: { unidades: Unidad[] }) {
  const enIngreso = unidades.filter((u) => u.estado_unidad === 'Ingreso');
  return (
    <Tarjeta titulo="¿A qué unidad le harás el inventario?" icono={Truck}>
      {enIngreso.length === 0 ? (
        <Vacio icono={Truck} titulo="No hay unidades en Ingreso" texto="Registra la unidad primero en Unidades." accion={<Link href="/unidades?nueva=1" className={claseBotonAcento}>Registrar unidad</Link>} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {enIngreso.map((u) => (
            <Link key={u.id} href={`/inventario?unidad=${u.id}`} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:bg-white hover:shadow-md">
              <p className="font-mono text-lg font-black text-slate-900">{u.unidad_eco}</p>
              <p className="text-xs text-slate-500">{[u.modelo, u.cliente_aseguradora].filter(Boolean).join(' · ') || 'Sin datos'}</p>
            </Link>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}

function ModuloInventario() {
  const params = useSearchParams();
  const unidadId = params.get('unidad') ?? '';
  const unidades = useDatos(getUnidades);
  const unidad = unidades.datos?.find((u) => u.id === unidadId);

  return (
    <Pagina>
      {unidad && (
        <Link href={`/unidades/${unidad.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> {unidad.unidad_eco}
        </Link>
      )}
      <Encabezado icono={ClipboardList} seccion="Fase de ingreso" titulo="Inventario físico" descripcion="La misma hoja de siempre, en digital. Al guardar se descarga el Excel con el mismo formato." />
      <AvisoConfiguracion />
      {unidades.error && <ErrorCarga mensaje={unidades.error} reintentar={unidades.recargar} />}
      {unidades.cargando ? <Cargando /> : unidad ? <HojaInventario key={unidad.id} unidad={unidad} /> : <ElegirUnidad unidades={unidades.datos ?? []} />}
    </Pagina>
  );
}

export default function InventarioPage() {
  return (
    <Suspense fallback={<Pagina><Cargando /></Pagina>}>
      <ModuloInventario />
    </Suspense>
  );
}
