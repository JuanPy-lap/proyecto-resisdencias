'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileArchive,
  FileSpreadsheet,
  Hourglass,
  ImageIcon,
  Loader2,
  Lock,
  PartyPopper,
  QrCode,
  Truck,
} from 'lucide-react';
import {
  avanzarFase,
  eliminarFotografia,
  getEtiquetasQR,
  getFotografiasPorUnidad,
  getHistorialEstados,
  getInventarios,
  getUnidad,
} from '@/services/api';
import { mensajeDeError, useAviso, useDatos } from '@/lib/hooks';
import { descargarExpedienteZip } from '@/lib/descargas';
import { descargarExcelInventario } from '@/lib/excelInventario';
import {
  ESTADOS_UNIDAD,
  ETAPAS_FOTO,
  claseEstadoUnidad,
  etiquetaCombustible,
  formatearFecha,
  indiceEstado,
  siguienteEstado,
  situacionRetiro,
} from '@/lib/constantes';
import { pendientesParaAvanzar, resumir, tareasDeFase } from '@/lib/fases';
import { resumenHoja } from '@/lib/hojaInventario';
import type { EtapaFoto, FotografiaUnidad } from '@/types/supabase';
import HojaDanos from '@/components/DiagramaCamion';
import GaleriaFotos from '@/components/GaleriaFotos';
import { Aviso, AvisoConfiguracion, Cargando, ErrorCarga, Insignia, Pagina, Tarjeta, Vacio, claseBotonAcento, claseBotonSecundario } from '@/components/ui';

const MENSAJES_HECHO: Record<string, string> = {
  inventario: 'Inventario guardado y Excel descargado.',
  fotos: 'Fotos guardadas en el expediente.',
  qr: 'QR actualizados.',
};

function Expediente() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const aviso = useAviso();
  const [etapa, setEtapa] = useState<EtapaFoto>('Ingreso');
  const [confirmar, setConfirmar] = useState(false);
  const [avanzando, setAvanzando] = useState(false);
  const [progresoZip, setProgresoZip] = useState<string | null>(null);
  const [generandoExcel, setGenerandoExcel] = useState(false);

  const { datos, setDatos, error, cargando, recargar } = useDatos(
    () => Promise.all([getUnidad(id), getFotografiasPorUnidad(id), getInventarios(id), getEtiquetasQR(id), getHistorialEstados(id)]),
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

  const [unidad, fotos, inventarios, etiquetas, historial] = datos;
  if (!unidad) {
    return (
      <Pagina>
        <Vacio icono={Truck} titulo="Unidad no encontrada" accion={<Link href="/unidades" className={claseBotonSecundario}>Volver a unidades</Link>} />
      </Pagina>
    );
  }

  const resumen = resumir(fotos, inventarios, etiquetas);
  const tareas = tareasDeFase(unidad, resumen);
  const faltan = pendientesParaAvanzar(tareas);
  const siguiente = siguienteEstado(unidad.estado_unidad);
  const actual = indiceEstado(unidad.estado_unidad);
  const infoFase = ESTADOS_UNIDAD[actual];
  const primeraPendiente = tareas.find((t) => !t.hecha);
  const inventario = inventarios[0];
  const hoja = resumenHoja(inventario?.checklist);
  const hecho = params.get('hecho');
  const fechaDeFase = (estado: string) => [...historial].reverse().find((h) => h.estado === estado);

  const avanzar = async () => {
    setAvanzando(true);
    try {
      const actualizada = await avanzarFase(unidad);
      const nuevoHistorial = await getHistorialEstados(unidad.id);
      setDatos([actualizada, fotos, inventarios, etiquetas, nuevoHistorial]);
      setConfirmar(false);
      aviso.exito(`${unidad.unidad_eco} pasó a «${actualizada.estado_unidad}».`);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setAvanzando(false);
    }
  };

  const borrarFoto = async (foto: FotografiaUnidad) => {
    try {
      await eliminarFotografia(foto);
      setDatos([unidad, fotos.filter((f) => f.id !== foto.id), inventarios, etiquetas, historial]);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    }
  };

  const descargarZip = async () => {
    setProgresoZip('…');
    try {
      await descargarExpedienteZip(unidad.unidad_eco, fotos, (h, t) => setProgresoZip(`${h}/${t}`));
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setProgresoZip(null);
    }
  };

  const descargarExcel = async () => {
    if (!inventario) return;
    setGenerandoExcel(true);
    try {
      await descargarExcelInventario(unidad, inventario, inventario.danos_diagrama);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setGenerandoExcel(false);
    }
  };

  const fotosEtapa = fotos.filter((f) => f.etapa === etapa);

  return (
    <Pagina>
      <Link href="/unidades" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Unidades
      </Link>

      {hecho && MENSAJES_HECHO[hecho] && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-5 w-5" /> {MENSAJES_HECHO[hecho]}
        </div>
      )}

      {/* Cabecera + línea de fases */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="flex items-center gap-4 p-6 sm:p-8">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-500 text-slate-950">
            <Truck className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Cono</p>
            <h1 className="font-mono text-3xl font-black tracking-tight sm:text-4xl">{unidad.unidad_eco}</h1>
            <p className="truncate text-sm text-slate-400">{[unidad.modelo, unidad.cliente_aseguradora, unidad.tipo_golpe].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</p>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-white/10 bg-white/[0.03] px-6 py-5 sm:px-8">
          <ol className="flex min-w-[600px] items-start">
            {ESTADOS_UNIDAD.map((estado, i) => {
              const registro = fechaDeFase(estado.valor);
              const hechoPaso = i < actual;
              const enCurso = i === actual;
              return (
                <li key={estado.valor} className="flex flex-1 items-start last:flex-none">
                  <div className="flex w-24 flex-col items-center gap-1.5 text-center">
                    <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ring-2 ${enCurso ? 'bg-amber-500 text-slate-950 ring-amber-300' : hechoPaso ? 'bg-emerald-500 text-white ring-emerald-400' : 'bg-slate-800 text-slate-500 ring-slate-700'}`}>
                      {hechoPaso ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={`text-xs font-semibold leading-tight ${enCurso ? 'text-amber-400' : hechoPaso ? 'text-slate-200' : 'text-slate-500'}`}>{estado.valor}</span>
                    {registro && i <= actual && <span className="text-[10px] text-slate-500">{formatearFecha(registro.created_at)}</span>}
                  </div>
                  {i < ESTADOS_UNIDAD.length - 1 && <span className={`mt-4 h-0.5 flex-1 rounded ${i < actual ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Fase actual: lo que hay que hacer ahora */}
      <Tarjeta className="ring-2 ring-amber-400">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Fase {actual + 1} de {ESTADOS_UNIDAD.length}</p>
              <h2 className="text-xl font-black text-slate-900">{unidad.estado_unidad}</h2>
              <p className="text-sm text-slate-500">{infoFase.descripcion}</p>
            </div>
            <Insignia clase={claseEstadoUnidad(unidad.estado_unidad)}>{unidad.estado_unidad}</Insignia>
          </div>

          {unidad.estado_unidad === 'Entrega' ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-200">
              <PartyPopper className="h-6 w-6" />
              <p className="text-sm font-medium">Unidad entregada el {formatearFecha(fechaDeFase('Entrega')?.created_at)}. El expediente queda cerrado.</p>
            </div>
          ) : unidad.estado_unidad === 'Espera de Liberación' ? (
            <div className="flex items-center gap-3 rounded-xl bg-violet-50 p-4 text-violet-800 ring-1 ring-violet-200">
              <Hourglass className="h-6 w-6 shrink-0" />
              <p className="text-sm">Esperando que la aseguradora libere la reparación. Cuando llegue la liberación, registra el inicio del proceso.</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {tareas.map((t) => (
                <li key={t.clave} className={`flex flex-col gap-3 rounded-xl p-3 ring-1 sm:flex-row sm:items-center ${t.hecha ? 'bg-emerald-50/60 ring-emerald-200' : 'bg-white ring-slate-200'}`}>
                  <div className="flex flex-1 items-center gap-3">
                    {t.hecha ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" /> : <Circle className="h-6 w-6 shrink-0 text-slate-300" />}
                    <div>
                      <p className="font-semibold text-slate-900">
                        {t.titulo} {!t.obligatoria && <span className="text-xs font-normal text-slate-400">(opcional)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{t.detalle}</p>
                    </div>
                  </div>
                  <Link href={t.href} className={t === primeraPendiente ? claseBotonAcento : `${claseBotonSecundario} py-2 text-xs`}>
                    {t.accion} <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {siguiente && (
            <div className="border-t border-slate-100 pt-4">
              {faltan.length > 0 ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Lock className="h-4 w-4" /> Para pasar a «{siguiente}» falta: {faltan.map((t) => t.titulo.toLowerCase()).join(', ')}.
                </p>
              ) : confirmar ? (
                <div className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center">
                  <p className="flex-1 text-sm text-amber-900">
                    ¿Pasar <strong>{unidad.unidad_eco}</strong> a «{siguiente}»? <strong>Ya no se podrá regresar</strong> a «{unidad.estado_unidad}».
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmar(false)} className={claseBotonSecundario}>Cancelar</button>
                    <button onClick={avanzar} disabled={avanzando} className={claseBotonAcento}>
                      {avanzando && <Loader2 className="h-4 w-4 animate-spin" />} Sí, pasar a {siguiente}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmar(true)} className={`${unidad.estado_unidad === 'Espera de Liberación' ? claseBotonAcento : 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800'} w-full sm:w-auto`}>
                  {unidad.estado_unidad === 'Espera de Liberación' ? 'Unidad liberada: iniciar proceso' : `Registrar fase: ${siguiente}`} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <Tarjeta titulo="Datos de la unidad" icono={Truck}>
            <dl className="space-y-2.5 text-sm">
              {[
                ['VIN', unidad.vin],
                ['Modelo', unidad.modelo],
                ['Cliente / Aseguradora', unidad.cliente_aseguradora],
                ['Tipo de golpe', unidad.tipo_golpe],
                ['Responsable', unidad.responsable_asignado],
                ['Ingreso', formatearFecha(unidad.fecha_ingreso)],
                ['Compromiso', formatearFecha(unidad.fecha_compromiso)],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{etiqueta}</dt>
                  <dd className="text-right font-medium text-slate-900">{valor || '—'}</dd>
                </div>
              ))}
            </dl>
          </Tarjeta>

          <Tarjeta titulo={`QR (${etiquetas.length})`} icono={QrCode}>
            {etiquetas.length === 0 ? (
              <p className="text-sm text-slate-500">Sin QR registrados.</p>
            ) : (
              <ul className="space-y-2">
                {etiquetas.map((q) => {
                  const s = situacionRetiro(q);
                  return (
                    <li key={q.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200/70">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold">{q.codigo_qr} · {q.taller}</span>
                        {q.estado === 'Retirada' ? <Insignia clase="bg-emerald-50 text-emerald-700 ring-emerald-200">Retirada</Insignia> : s && <Insignia clase={s.clase}>{s.texto}</Insignia>}
                      </div>
                      <p className="text-xs text-slate-500">
                        {q.ubicacion_rack ? `Rack ${q.ubicacion_rack} · ` : ''}colocado {formatearFecha(q.fecha_colocacion)} · {q.estado === 'Retirada' ? `retirado ${formatearFecha(q.fecha_retiro)}` : `retirar ${formatearFecha(q.fecha_retiro_programada)}`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>
        </div>

        <div className="space-y-6">
          <Tarjeta
            titulo={`Fotos (${fotos.length})`}
            icono={ImageIcon}
            acciones={
              fotos.length > 0 && (
                <button onClick={descargarZip} disabled={!!progresoZip} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
                  {progresoZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
                  {progresoZip ? `ZIP ${progresoZip}` : 'Descargar ZIP'}
                </button>
              )
            }
          >
            <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {ETAPAS_FOTO.map((e) => (
                <button key={e.valor} onClick={() => setEtapa(e.valor)} className={`rounded-lg py-1.5 transition ${etapa === e.valor ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                  {e.valor} ({resumen.fotos[e.valor]})
                </button>
              ))}
            </div>
            {fotosEtapa.length === 0 ? <Vacio icono={ImageIcon} titulo={`Sin fotos de ${etapa.toLowerCase()}`} /> : <GaleriaFotos fotos={fotosEtapa} alEliminar={borrarFoto} />}
          </Tarjeta>

          <Tarjeta
            titulo="Inventario de ingreso"
            icono={ClipboardList}
            acciones={
              inventario && (
                <button onClick={descargarExcel} disabled={generandoExcel} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
                  {generandoExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Descargar Excel
                </button>
              )
            }
          >
            {!inventario ? (
              <Vacio icono={ClipboardList} titulo="Aún no se captura el inventario" />
            ) : (
              <div className="space-y-4 text-sm">
                <p className="text-slate-600">
                  <strong>{inventario.kilometraje.toLocaleString('es-MX')} km</strong> · Combustible LH <strong>{etiquetaCombustible(inventario.nivel_combustible)}</strong>
                  {inventario.nivel_combustible_rh !== null && <> · RH <strong>{etiquetaCombustible(inventario.nivel_combustible_rh)}</strong></>}
                  {' · '}{hoja.buenas} partes en buen estado · {inventario.danos_diagrama.length} golpe(s)
                </p>
                {(hoja.malas.length > 0 || hoja.regulares.length > 0) && (
                  <div className="space-y-1 text-xs">
                    {hoja.malas.length > 0 && <p><span className="font-bold text-red-600">Malo: </span>{hoja.malas.map((i) => i.etiqueta).join(', ')}</p>}
                    {hoja.regulares.length > 0 && <p><span className="font-bold text-amber-600">Regular: </span>{hoja.regulares.map((i) => i.etiqueta).join(', ')}</p>}
                  </div>
                )}
                {inventario.danos_diagrama.length > 0 && <HojaDanos marcas={inventario.danos_diagrama} />}
                {(inventario.observaciones || inventario.observaciones_mecanicas || inventario.observaciones_carroceria) && (
                  <p className="rounded-xl bg-slate-50 p-3 text-slate-600">
                    {[inventario.observaciones, inventario.observaciones_mecanicas, inventario.observaciones_carroceria].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Elaboró {inventario.capturado_por}
                  {inventario.supervisor ? ` · Supervisor ${inventario.supervisor}` : ''} · {formatearFecha(inventario.created_at, true)}
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

export default function ExpedienteUnidadPage() {
  return (
    <Suspense fallback={<Pagina><Cargando /></Pagina>}>
      <Expediente />
    </Suspense>
  );
}
