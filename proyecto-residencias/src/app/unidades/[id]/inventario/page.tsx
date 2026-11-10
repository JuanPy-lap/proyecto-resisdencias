'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { getInventarios, getUnidad } from '@/services/api';
import { useDatos } from '@/lib/hooks';
import { formatearFecha } from '@/lib/constantes';
import HojaInventario from '@/components/HojaInventario';
import { AvisoConfiguracion, Cargando, Encabezado, ErrorCarga, Pagina, Vacio, claseBotonAcento, claseInput } from '@/components/ui';

/** Inventario ya guardado de la unidad, en el formato de la hoja (solo lectura) con su Excel. */
export default function InventarioDeUnidadPage() {
  const { id } = useParams<{ id: string }>();
  const [elegido, setElegido] = useState(0);
  const { datos, error, cargando, recargar } = useDatos(() => Promise.all([getUnidad(id), getInventarios(id)]), id);

  if (cargando) return <Pagina><Cargando texto="Cargando inventario…" /></Pagina>;
  const [unidad, inventarios] = datos ?? [null, []];
  const inventario = inventarios[elegido];

  return (
    <Pagina>
      <Link href={`/unidades/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> {unidad?.unidad_eco ?? 'Unidad'}
      </Link>
      <Encabezado
        icono={ClipboardList}
        seccion={unidad ? `Cono ${unidad.unidad_eco}` : 'Inventario'}
        titulo="Inventario físico"
        descripcion={inventario ? `Capturado el ${formatearFecha(inventario.created_at, true)} por ${inventario.capturado_por}.` : undefined}
        acciones={
          inventarios.length > 1 && (
            <select value={elegido} onChange={(e) => setElegido(Number(e.target.value))} className={`${claseInput} w-auto`}>
              {inventarios.map((inv, i) => (
                <option key={inv.id} value={i}>
                  {i === 0 ? 'Más reciente · ' : ''}{formatearFecha(inv.created_at, true)}
                </option>
              ))}
            </select>
          )
        }
      />
      <AvisoConfiguracion />
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}

      {unidad && inventario ? (
        <HojaInventario key={inventario.id} unidad={unidad} guardado={inventario} />
      ) : (
        unidad && (
          <Vacio
            icono={ClipboardList}
            titulo="Esta unidad aún no tiene inventario"
            accion={unidad.estado_unidad === 'Ingreso' && <Link href={`/inventario?unidad=${unidad.id}`} className={claseBotonAcento}>Capturar inventario</Link>}
          />
        )
      )}
    </Pagina>
  );
}
