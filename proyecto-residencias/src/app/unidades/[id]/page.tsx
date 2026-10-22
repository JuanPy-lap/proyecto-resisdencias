'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Check,
  ClipboardList,
  FileArchive,
  Fuel,
  Gauge,
  ImageIcon,
  Loader2,
  QrCode,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import {
  actualizarUnidad,
  eliminarFotografia,
  getEtiquetasQR,
  getFotografiasPorUnidad,
  getInventarios,
  getUnidad,
} from '@/services/api';
import { mensajeDeError, useAviso, useDatos } from '@/lib/hooks';
import { descargarExpedienteZip } from '@/lib/descargas';
import {
  ESTADOS_QR,
  ESTADOS_SALIDA,
  ESTADOS_UNIDAD,
  ETAPAS_FOTO,
  TIPOS_DANO,
  VISTAS_DIAGRAMA,
  claseEstadoUnidad,
  formatearFecha,
  infoTipoDano,
} from '@/lib/constantes';
import type { EstadoUnidad, EtapaFoto } from '@/types/supabase';
import DiagramaCamion from '@/components/DiagramaCamion';
import GaleriaFotos from '@/components/GaleriaFotos';
import {
  Aviso,
  AvisoConfiguracion,
  Cargando,
  ErrorCarga,
  Insignia,
  Pagina,
  Tarjeta,
  Vacio,
  claseBotonSecundario,
} from '@/components/ui';

export default function ExpedienteUnidadPage() {
  const { id } = useParams<{ id: string }>();
  const aviso = useAviso();
  const [etapa, setEtapa] = useState<EtapaFoto | 'Todas'>('Todas');
  const [cambiandoEstado, setCambiandoEstado] = useState<EstadoUnidad | null>(null);
  const [progresoZip, setProgresoZip] = useState<string | null>(null);

  const { datos, setDatos, error, cargando, recargar } = useDatos(
    () => Promise.all([getUnidad(id), getFotografiasPorUnidad(id), getInventarios(id), getEtiquetasQR(id)]),
    id
  );

  if (cargando) return <Pagina><Cargando texto="Cargando expediente…" /></Pagina>;
  if (error || !datos) {
    return (
      <Pagina>
        <AvisoConfiguracion />
        {error && <ErrorCarga mensaje={error} reintentar={recargar} />}
      </Pagina>
    );
  }

  const [unidad, fotos, inventarios, etiquetas] = datos;
  if (!unidad) {
    return (
      <Pagina>
        <Vacio icono={Truck} titulo="Unidad no encontrada" texto="Puede que haya sido eliminada." accion={<Link href="/unidades" className={claseBotonSecundario}>Volver a unidades</Link>} />
      </Pagina>
    );
  }

  const qrPendientes = etiquetas.filter((q) => q.estado !== 'Retirada');
  const indiceEstado = ESTADOS_UNIDAD.findIndex((e) => e.valor === unidad.estado_unidad);
  const fotosVisibles = etapa === 'Todas' ? fotos : fotos.filter((f) => f.etapa === etapa);
  const ultimoInventario = inventarios[0];

  const cambiarEstado = async (estado: EstadoUnidad) => {
    if (estado === unidad.estado_unidad) return;
    // Regla del taller: no se libera ni entrega una unidad con QR sin retirar.
    if (['Liberada', 'Entregada'].includes(estado) && qrPendientes.length > 0) {
      aviso.error(`Retira primero ${qrPendientes.length} etiqueta(s) QR: ${qrPendientes.map((q) => q.codigo_qr).join(', ')}.`);
      return;
    }
    setCambiandoEstado(estado);
    try {
      const actualizada = await actualizarUnidad(unidad.id, { estado_unidad: estado });
      setDatos([actualizada, fotos, inventarios, etiquetas]);
      aviso.exito(`${unidad.unidad_eco} ahora está en «${estado}».`);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setCambiandoEstado(null);
    }
  };

  const borrarFoto = async (foto: (typeof fotos)[number]) => {
    try {
      await eliminarFotografia(foto);
      setDatos([unidad, fotos.filter((f) => f.id !== foto.id), inventarios, etiquetas]);
      aviso.exito('Fotografía eliminada.');
    } catch (err) {
      aviso.error(mensajeDeError(err));
    }
  };

  const descargarZip = async () => {
    setProgresoZip('Preparando…');
    try {
      await descargarExpedienteZip(unidad.unidad_eco, fotos, (h, t) => setProgresoZip(`${h}/${t}`));
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setProgresoZip(null);
    }
  };

  const datosFicha = [
    ['VIN', unidad.vin],
    ['Modelo', unidad.modelo],
    ['Cliente / Aseguradora', unidad.cliente_aseguradora],
    ['Tipo de golpe', unidad.tipo_golpe],
    ['Responsable', unidad.responsable_asignado],
    ['Ingreso', formatearFecha(unidad.fecha_ingreso)],
    ['Compromiso', formatearFecha(unidad.fecha_compromiso)],
  ];

  return (
    <Pagina>
      <Link href="/unidades" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Unidades
      </Link>

      {/* Cabecera del expediente */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-500 text-slate-950">
              <Truck className="h-8 w-8" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Expediente</p>
              <h1 className="font-mono text-3xl font-black tracking-tight sm:text-4xl">{unidad.unidad_eco}</h1>
              <p className="text-sm text-slate-400">{[unidad.modelo, unidad.cliente_aseguradora].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link href={`/camara?unidad=${unidad.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400">
              <Camera className="h-4 w-4" /> Fotos
            </Link>
            <Link href={`/inventario?unidad=${unidad.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15">
              <ClipboardList className="h-4 w-4" /> Inventario
            </Link>
            <Link href={`/qr-supervision?unidad=${unidad.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15">
              <QrCode className="h-4 w-4" /> QR
            </Link>
            <button onClick={descargarZip} disabled={!fotos.length || !!progresoZip} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-40">
              {progresoZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
              {progresoZip ? `ZIP ${progresoZip}` : 'Descargar ZIP'}
            </button>
          </div>
        </div>

        {/* Línea de estados: clic para avanzar */}
        <div className="overflow-x-auto border-t border-white/10 bg-white/[0.03] px-6 py-5 sm:px-8">
          <ol className="flex min-w-[640px] items-center">
            {ESTADOS_UNIDAD.map((estado, i) => {
              const hecho = i < indiceEstado;
              const actual = i === indiceEstado;
              const bloqueado = ['Liberada', 'Entregada'].includes(estado.valor) && qrPendientes.length > 0;
              return (
                <li key={estado.valor} className="flex flex-1 items-center last:flex-none">
                  <button
                    onClick={() => cambiarEstado(estado.valor)}
                    disabled={!!cambiandoEstado}
                    title={bloqueado ? 'Hay etiquetas QR sin retirar' : `Cambiar a ${estado.valor}`}
                    className="group flex flex-col items-center gap-2"
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ring-2 transition ${
                        actual ? 'bg-amber-500 text-slate-950 ring-amber-300' : hecho ? 'bg-emerald-500 text-white ring-emerald-400' : 'bg-slate-800 text-slate-400 ring-slate-700 group-hover:ring-slate-500'
                      }`}
                    >
                      {cambiandoEstado === estado.valor ? <Loader2 className="h-4 w-4 animate-spin" /> : hecho ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={`whitespace-nowrap text-xs font-semibold ${actual ? 'text-amber-400' : hecho ? 'text-slate-300' : 'text-slate-500'}`}>
                      {estado.valor}
                    </span>
                  </button>
                  {i < ESTADOS_UNIDAD.length - 1 && <span className={`mx-2 mb-6 h-0.5 flex-1 rounded ${i < indiceEstado ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {qrPendientes.length > 0 && ESTADOS_SALIDA.includes(unidad.estado_unidad) && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <p>
            Esta unidad está en «{unidad.estado_unidad}» y aún tiene {qrPendientes.length} etiqueta(s) QR sin retirar. Retíralas
            antes de liberarla.{' '}
            <Link href={`/qr-supervision?unidad=${unidad.id}`} className="font-bold underline">Ir a QR</Link>
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <Tarjeta titulo="Datos de la unidad" icono={Truck}>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Estado</dt>
                <dd><Insignia clase={claseEstadoUnidad(unidad.estado_unidad)}>{unidad.estado_unidad}</Insignia></dd>
              </div>
              {datosFicha.map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{etiqueta}</dt>
                  <dd className="text-right font-medium text-slate-900">{valor || '—'}</dd>
                </div>
              ))}
            </dl>
          </Tarjeta>

          <Tarjeta titulo={`Etiquetas QR (${etiquetas.length})`} icono={QrCode}>
            {etiquetas.length === 0 ? (
              <p className="text-sm text-slate-500">Sin etiquetas registradas.</p>
            ) : (
              <ul className="space-y-2">
                {etiquetas.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200/70">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-slate-900">{q.codigo_qr}</p>
                      <p className="truncate text-xs text-slate-500">{q.taller}{q.ubicacion_rack ? ` · ${q.ubicacion_rack}` : ''}</p>
                    </div>
                    <Insignia clase={ESTADOS_QR.find((e) => e.valor === q.estado)?.clase ?? ''}>{q.estado}</Insignia>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>

        <div className="space-y-6">
          <Tarjeta
            titulo={`Fotografías (${fotos.length})`}
            icono={ImageIcon}
            acciones={
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                {(['Todas', ...ETAPAS_FOTO.map((e) => e.valor)] as const).map((e) => (
                  <button key={e} onClick={() => setEtapa(e)} className={`rounded-lg px-2.5 py-1 transition ${etapa === e ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                    {e}
                  </button>
                ))}
              </div>
            }
          >
            {fotosVisibles.length === 0 ? (
              <Vacio icono={Camera} titulo="Sin fotografías en esta etapa" accion={<Link href={`/camara?unidad=${unidad.id}`} className={claseBotonSecundario}><Camera className="h-4 w-4" />Tomar fotos</Link>} />
            ) : (
              <GaleriaFotos fotos={fotosVisibles} alEliminar={borrarFoto} />
            )}
          </Tarjeta>

          <Tarjeta titulo="Inventario de ingreso" icono={ClipboardList}>
            {!ultimoInventario ? (
              <Vacio icono={ClipboardList} titulo="Aún no se captura el inventario" accion={<Link href={`/inventario?unidad=${unidad.id}`} className={claseBotonSecundario}>Capturar inventario</Link>} />
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                    <p className="flex items-center gap-1 text-xs text-slate-500"><Gauge className="h-3.5 w-3.5" /> Kilometraje</p>
                    <p className="mt-1 font-bold tabular-nums">{ultimoInventario.kilometraje.toLocaleString('es-MX')} km</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                    <p className="flex items-center gap-1 text-xs text-slate-500"><Fuel className="h-3.5 w-3.5" /> Combustible</p>
                    <p className="mt-1 font-bold tabular-nums">{ultimoInventario.nivel_combustible}%</p>
                  </div>
                  {[
                    ['Gato hidráulico', ultimoInventario.tiene_gato_hidraulico],
                    ['Extintor', ultimoInventario.tiene_extintor],
                    ['Llanta de refacción', ultimoInventario.tiene_llanta_refaccion],
                  ].map(([nombre, tiene]) => (
                    <div key={String(nombre)} className={`rounded-xl p-3 text-xs font-semibold ring-1 ${tiene ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>
                      {tiene ? '✓' : '✗'} {nombre}
                    </div>
                  ))}
                </div>

                {ultimoInventario.danos_diagrama.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {VISTAS_DIAGRAMA.filter((v) => ultimoInventario.danos_diagrama.some((d) => d.vista === v.valor)).map((v) => (
                      <div key={v.valor}>
                        <p className="mb-1 text-xs font-semibold text-slate-500">{v.etiqueta}</p>
                        <DiagramaCamion vista={v.valor} compacto puntos={ultimoInventario.danos_diagrama.filter((d) => d.vista === v.valor)} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {TIPOS_DANO.map((t) => {
                    const n = ultimoInventario.danos_diagrama.filter((d) => d.tipo_dano === t.valor).length;
                    return n ? <Insignia key={t.valor} clase={infoTipoDano(t.valor).clase}>{t.etiqueta}: {n}</Insignia> : null;
                  })}
                </div>

                {(ultimoInventario.observaciones_mecanicas || ultimoInventario.observaciones_carroceria) && (
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    {ultimoInventario.observaciones_mecanicas && (
                      <p className="rounded-xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Mecánica</span>{ultimoInventario.observaciones_mecanicas}</p>
                    )}
                    {ultimoInventario.observaciones_carroceria && (
                      <p className="rounded-xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Carrocería</span>{ultimoInventario.observaciones_carroceria}</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  Capturado por {ultimoInventario.capturado_por} · {formatearFecha(ultimoInventario.created_at, true)}
                  {inventarios.length > 1 ? ` · ${inventarios.length - 1} inventario(s) anterior(es)` : ''}
                </p>
              </div>
            )}
          </Tarjeta>
        </div>
      </div>

      <Aviso aviso={aviso.aviso} cerrar={aviso.cerrar} />
    </Pagina>
  );
}
