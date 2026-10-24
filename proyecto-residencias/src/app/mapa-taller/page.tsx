'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, DoorOpen, GripVertical, Loader2, MapPinned, MoveRight, QrCode, Truck } from 'lucide-react';
import { getEtiquetasQR, getUnidades, moverEtiquetaQR } from '@/services/api';
import { mensajeDeError, useAviso, useDatos } from '@/lib/hooks';
import { ESTADOS_SALIDA, TALLERES, claseEstadoUnidad, situacionRetiro } from '@/lib/constantes';
import type { EtiquetaQRConUnidad } from '@/types/supabase';
import {
  Aviso,
  AvisoConfiguracion,
  Cargando,
  Encabezado,
  ErrorCarga,
  Insignia,
  Pagina,
  Tarjeta,
  claseInput,
} from '@/components/ui';

// Posición de cada área en el plano (cuadrícula de 6x4 en escritorio).
const DISTRIBUCION: Record<string, string> = {
  Recepción: 'md:col-start-1 md:row-start-1 md:col-span-2 md:row-span-1',
  Mecánica: 'md:col-start-1 md:row-start-2 md:col-span-2 md:row-span-3',
  Laminado: 'md:col-start-3 md:row-start-1 md:col-span-2 md:row-span-2',
  Almacén: 'md:col-start-3 md:row-start-3 md:col-span-2 md:row-span-2',
  Pintura: 'md:col-start-5 md:row-start-1 md:col-span-2 md:row-span-3',
};

export default function MapaTallerPage() {
  const aviso = useAviso();
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [destino, setDestino] = useState({ taller: '', rack: '' });
  const [moviendo, setMoviendo] = useState(false);
  const [sobreArea, setSobreArea] = useState<string | null>(null);

  const datos = useDatos(() => Promise.all([getEtiquetasQR(), getUnidades()]));
  const [etiquetas, unidades] = datos.datos ?? [[], []];

  const colocadas = etiquetas.filter((q) => q.estado === 'Colocada');
  const conUbicacion = new Set(colocadas.map((q) => q.unidad_id));
  const sinUbicar = unidades.filter((u) => u.estado_unidad !== 'Entrega' && !conUbicacion.has(u.id));
  const elegida = colocadas.find((q) => q.id === seleccion) ?? null;

  const seleccionar = (q: EtiquetaQRConUnidad) => {
    setSeleccion(q.id);
    setDestino({ taller: q.taller, rack: q.ubicacion_rack ?? '' });
  };

  const mover = async (q: EtiquetaQRConUnidad, taller: string, rack: string | null) => {
    if (q.taller === taller && (q.ubicacion_rack ?? '') === (rack ?? '')) return;
    setMoviendo(true);
    try {
      const actualizada = await moverEtiquetaQR(q.id, taller, rack);
      datos.setDatos([etiquetas.map((x) => (x.id === q.id ? { ...x, ...actualizada } : x)), unidades]);
      aviso.exito(`${q.unidades?.unidad_eco ?? q.codigo_qr} movida a ${taller}${rack ? ` / ${rack}` : ''}.`);
      setDestino({ taller, rack: rack ?? '' });
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setMoviendo(false);
    }
  };

  const soltar = (taller: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setSobreArea(null);
    const q = colocadas.find((x) => x.id === e.dataTransfer.getData('text/plain'));
    if (q) mover(q, taller, q.taller === taller ? q.ubicacion_rack : null);
  };

  return (
    <Pagina>
      <Encabezado
        icono={MapPinned}
        seccion="Patio"
        titulo="Mapa del taller"
        descripcion="Ubicación de cada unidad según su etiqueta QR colocada. Arrastra una unidad a otra área para moverla."
      />

      <AvisoConfiguracion />
      {datos.error && <ErrorCarga mensaje={datos.error} reintentar={datos.recargar} />}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Tarjeta sinPadding className="overflow-hidden">
          {datos.cargando ? (
            <Cargando texto="Cargando plano…" />
          ) : (
            <div className="fondo-plano p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 md:min-h-[560px] md:grid-cols-6 md:grid-rows-4">
                {TALLERES.map((area) => {
                  const enArea = colocadas.filter((q) => q.taller === area.nombre);
                  const racks = [...new Set(enArea.map((q) => q.ubicacion_rack ?? 'Piso'))].sort();
                  return (
                    <div
                      key={area.nombre}
                      onDragOver={(e) => { e.preventDefault(); setSobreArea(area.nombre); }}
                      onDragLeave={() => setSobreArea(null)}
                      onDrop={soltar(area.nombre)}
                      className={`flex flex-col rounded-2xl border-2 border-dashed p-3 transition ${area.clase} ${area.borde} ${DISTRIBUCION[area.nombre] ?? ''} ${sobreArea === area.nombre ? 'scale-[1.01] border-solid shadow-lg' : ''}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-black uppercase tracking-wider">{area.nombre}</p>
                        <span className="rounded-full bg-white/80 px-2 text-xs font-bold tabular-nums">{enArea.length}</span>
                      </div>
                      {enArea.length === 0 ? (
                        <p className="m-auto py-4 text-xs opacity-50">Sin unidades</p>
                      ) : (
                        <div className="space-y-2">
                          {racks.map((rack) => (
                            <div key={rack}>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-60">{rack}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {enArea.filter((q) => (q.ubicacion_rack ?? 'Piso') === rack).map((q) => {
                                  // En rojo: unidad de salida o QR con retiro vencido / para hoy.
                                  const tipoRetiro = situacionRetiro(q)?.tipo;
                                  const salida =
                                    (q.unidades && ESTADOS_SALIDA.includes(q.unidades.estado_unidad)) || tipoRetiro === 'vencido' || tipoRetiro === 'hoy';
                                  return (
                                    <button
                                      key={q.id}
                                      draggable
                                      onDragStart={(e) => e.dataTransfer.setData('text/plain', q.id)}
                                      onClick={() => seleccionar(q)}
                                      className={`flex cursor-grab items-center gap-1 rounded-lg bg-white px-2 py-1 font-mono text-xs font-bold text-slate-800 shadow-sm ring-1 transition active:cursor-grabbing ${
                                        seleccion === q.id ? 'ring-2 ring-slate-900' : salida ? 'ring-red-400' : 'ring-slate-200 hover:ring-slate-400'
                                      }`}
                                    >
                                      <GripVertical className="hidden h-3 w-3 text-slate-300 md:block" />
                                      <Truck className={`h-3.5 w-3.5 ${salida ? 'text-red-500' : 'text-amber-600'}`} />
                                      {q.unidades?.unidad_eco ?? q.codigo_qr}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="hidden items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-bold uppercase tracking-widest text-amber-400 md:col-span-2 md:col-start-5 md:row-start-4 md:flex">
                  <DoorOpen className="h-5 w-5" /> Salida
                </div>
              </div>
            </div>
          )}
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo="Unidad seleccionada" icono={Truck}>
            {!elegida ? (
              <p className="text-sm text-slate-500">Toca una unidad del plano para ver su detalle o moverla.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-black">{elegida.unidades?.unidad_eco}</span>
                    {elegida.unidades && <Insignia clase={claseEstadoUnidad(elegida.unidades.estado_unidad)}>{elegida.unidades.estado_unidad}</Insignia>}
                  </div>
                  <p className="mt-1 flex items-center gap-1 font-mono text-xs text-slate-500">
                    <QrCode className="h-3.5 w-3.5" /> {elegida.codigo_qr}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={destino.taller} onChange={(e) => setDestino({ ...destino, taller: e.target.value })} className={claseInput}>
                    {TALLERES.map((t) => <option key={t.nombre}>{t.nombre}</option>)}
                  </select>
                  <input value={destino.rack} onChange={(e) => setDestino({ ...destino, rack: e.target.value.toUpperCase() })} placeholder="Rack" className={claseInput} />
                </div>
                <button onClick={() => mover(elegida, destino.taller, destino.rack.trim() || null)} disabled={moviendo} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  {moviendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoveRight className="h-4 w-4" />}
                  Mover unidad
                </button>
                {elegida.unidades && (
                  <Link href={`/unidades/${elegida.unidades.id}`} className="flex items-center justify-center gap-1 text-sm font-semibold text-amber-600 hover:underline">
                    Abrir expediente <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </Tarjeta>

          <Tarjeta titulo={`Sin ubicar (${sinUbicar.length})`} icono={MapPinned}>
            {sinUbicar.length === 0 ? (
              <p className="text-sm text-slate-500">Todas las unidades activas tienen QR colocado.</p>
            ) : (
              <ul className="space-y-2">
                {sinUbicar.slice(0, 8).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-mono font-bold">{u.unidad_eco}</span>
                    <Link href={`/qr-supervision?unidad=${u.id}`} className="text-xs font-semibold text-amber-600 hover:underline">Asignar QR</Link>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>

      <Aviso aviso={aviso.aviso} cerrar={aviso.cerrar} />
    </Pagina>
  );
}
