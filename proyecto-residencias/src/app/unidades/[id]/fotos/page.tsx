'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Camera, FileArchive, ImageIcon, Loader2 } from 'lucide-react';
import { eliminarFotografia, getFotografiasPorUnidad, getUnidad } from '@/services/api';
import { mensajeDeError, useAviso, useDatos } from '@/lib/hooks';
import { descargarExpedienteZip } from '@/lib/descargas';
import { ETAPAS_FOTO } from '@/lib/constantes';
import type { FotografiaUnidad } from '@/types/supabase';
import GaleriaFotos from '@/components/GaleriaFotos';
import { Aviso, AvisoConfiguracion, Cargando, Encabezado, ErrorCarga, Insignia, Pagina, Tarjeta, claseBotonSecundario } from '@/components/ui';

/** Todas las fotos de la unidad, separadas por etapa. */
export default function FotosDeUnidadPage() {
  const { id } = useParams<{ id: string }>();
  const aviso = useAviso();
  const [progresoZip, setProgresoZip] = useState<string | null>(null);
  const { datos, setDatos, error, cargando, recargar } = useDatos(() => Promise.all([getUnidad(id), getFotografiasPorUnidad(id)]), id);

  if (cargando) return <Pagina><Cargando texto="Cargando fotos…" /></Pagina>;
  const [unidad, fotos] = datos ?? [null, []];

  const borrar = async (foto: FotografiaUnidad) => {
    try {
      await eliminarFotografia(foto);
      setDatos([unidad, fotos.filter((f) => f.id !== foto.id)]);
      aviso.exito('Foto eliminada.');
    } catch (err) {
      aviso.error(mensajeDeError(err));
    }
  };

  const descargarZip = async () => {
    if (!unidad) return;
    setProgresoZip('…');
    try {
      await descargarExpedienteZip(unidad.unidad_eco, fotos, (h, t) => setProgresoZip(`${h}/${t}`));
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setProgresoZip(null);
    }
  };

  return (
    <Pagina>
      <Link href={`/unidades/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> {unidad?.unidad_eco ?? 'Unidad'}
      </Link>
      <Encabezado
        icono={ImageIcon}
        seccion={unidad ? `Cono ${unidad.unidad_eco}` : 'Fotos'}
        titulo={`Fotos (${fotos.length})`}
        acciones={
          fotos.length > 0 && (
            <button onClick={descargarZip} disabled={!!progresoZip} className={claseBotonSecundario}>
              {progresoZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
              {progresoZip ? `ZIP ${progresoZip}` : 'Descargar todo (ZIP)'}
            </button>
          )
        }
      />
      <AvisoConfiguracion />
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}

      {unidad &&
        ETAPAS_FOTO.map((etapa) => {
          const deEtapa = fotos.filter((f) => f.etapa === etapa.valor);
          // Solo se pueden agregar fotos de la etapa que corresponde a la fase actual.
          const puedeAgregar = !unidad.pt_fecha && etapa.fases.includes(unidad.estado_unidad);
          return (
            <Tarjeta
              key={etapa.valor}
              titulo={`${etapa.valor} (${deEtapa.length})`}
              icono={Camera}
              acciones={
                puedeAgregar && (
                  <Link href={`/fotos?etapa=${etapa.valor}&unidad=${unidad.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline">
                    <Camera className="h-4 w-4" /> Agregar fotos
                  </Link>
                )
              }
            >
              {deEtapa.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Sin fotos de {etapa.valor.toLowerCase()}. <Insignia clase={etapa.clase}>{etapa.descripcion}</Insignia>
                </p>
              ) : (
                <GaleriaFotos fotos={deEtapa} alEliminar={borrar} />
              )}
            </Tarjeta>
          );
        })}
      <Aviso aviso={aviso.aviso} cerrar={aviso.cerrar} />
    </Pagina>
  );
}
