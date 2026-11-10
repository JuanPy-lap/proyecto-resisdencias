'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Hourglass,
  ImageIcon,
  Loader2,
  Lock,
  PartyPopper,
  Pencil,
  QrCode,
  RotateCcw,
  Truck,
} from 'lucide-react';
import {
  avanzarFase,
  getEtiquetasQR,
  getFotografiasPorUnidad,
  getHistorialEstados,
  getInventarios,
  getUnidad,
  marcarPerdidaTotal,
  restaurarUnidad,
} from '@/services/api';
import { mensajeDeError, nombreUsuario, useAviso, useDatos, useUsuario } from '@/lib/hooks';
import { ESTADOS_UNIDAD, claseEstadoUnidad, formatearFecha, indiceEstado, siguienteEstado, situacionRetiro } from '@/lib/constantes';
import { pendientesParaAvanzar, resumir, tareasDeFase } from '@/lib/fases';
import type { EstadoUnidad, Unidad } from '@/types/supabase';
import FormularioUnidad from '@/components/FormularioUnidad';
import { Aviso, AvisoConfiguracion, Cargando, ErrorCarga, Insignia, Pagina, Tarjeta, Vacio, claseBotonAcento, claseBotonSecundario } from '@/components/ui';

const MENSAJES_HECHO: Record<string, string> = {
  inventario: 'Inventario guardado y Excel descargado.',
  fotos: 'Fotos guardadas en el expediente.',
  qr: 'QR actualizados.',
};

/** Fases en las que la unidad todavía no se libera y puede irse a pérdida total. */
const FASES_PT: EstadoUnidad[] = ['Ingreso', 'Espera de Liberación'];

const claseBotonCabecera =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15';

function Expediente() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const usuario = useUsuario();
  const aviso = useAviso();
  const [confirmar, setConfirmar] = useState(false);
  const [avanzando, setAvanzando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formPT, setFormPT] = useState(false);
  const [motivoPT, setMotivoPT] = useState('');
  const [procesandoPT, setProcesandoPT] = useState(false);

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

  const enPT = !!unidad.pt_fecha;
  const resumen = resumir(fotos, inventarios, etiquetas);
  const tareas = tareasDeFase(unidad, resumen);
  const faltan = pendientesParaAvanzar(tareas);
  const siguiente = siguienteEstado(unidad.estado_unidad);
  const actual = indiceEstado(unidad.estado_unidad);
  const infoFase = ESTADOS_UNIDAD[actual];
  const primeraPendiente = tareas.find((t) => !t.hecha);
  const hecho = params.get('hecho');
  const fechaDeFase = (estado: string) => [...historial].reverse().find((h) => h.estado === estado);
  const qrColocados = etiquetas.filter((q) => q.estado === 'Colocada').length;

  const actualizarUnidad = (u: Unidad) => setDatos([u, fotos, inventarios, etiquetas, historial]);

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

  const mandarAPT = async () => {
    setProcesandoPT(true);
    try {
      actualizarUnidad(await marcarPerdidaTotal(unidad.id, motivoPT.trim() || null, nombreUsuario(usuario)));
      setFormPT(false);
      aviso.exito(`${unidad.unidad_eco} se movió a Pérdida total (PT).`);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setProcesandoPT(false);
    }
  };

  const restaurar = async () => {
    setProcesandoPT(true);
    try {
      actualizarUnidad(await restaurarUnidad(unidad.id));
      aviso.exito(`${unidad.unidad_eco} regresó a Unidades.`);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setProcesandoPT(false);
    }
  };

  return (
    <Pagina>
      <Link href={enPT ? '/unidades?vista=pt' : '/unidades'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> {enPT ? 'Pérdida total (PT)' : 'Unidades'}
      </Link>

      {hecho && MENSAJES_HECHO[hecho] && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-5 w-5" /> {MENSAJES_HECHO[hecho]}
        </div>
      )}

      {/* Cabecera: cono + accesos directos a datos, inventario y fotos */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${enPT ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950'}`}>
              {enPT ? <Archive className="h-7 w-7" /> : <Truck className="h-7 w-7" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Cono</p>
              <h1 className="font-mono text-3xl font-black tracking-tight sm:text-4xl">{unidad.unidad_eco}</h1>
              <p className="truncate text-sm text-slate-400">{[unidad.modelo, unidad.cliente_aseguradora, unidad.tipo_golpe].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <button onClick={() => setEditando(true)} className={claseBotonCabecera}>
              <Pencil className="h-4 w-4" /> <span>Editar<span className="hidden sm:inline"> datos</span></span>
            </button>
            {inventarios.length > 0 ? (
              <Link href={`/unidades/${unidad.id}/inventario`} className={claseBotonCabecera}>
                <ClipboardList className="h-4 w-4" /> Inventario
              </Link>
            ) : (
              <span className={`${claseBotonCabecera} cursor-not-allowed opacity-40`} title="Aún no se captura el inventario">
                <ClipboardList className="h-4 w-4" /> Inventario
              </span>
            )}
            <Link href={`/unidades/${unidad.id}/fotos`} className={claseBotonCabecera}>
              <ImageIcon className="h-4 w-4" /> Fotos ({fotos.length})
            </Link>
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

      {enPT ? (
        /* Unidad en pérdida total: sin acciones de fase */
        <div className="flex flex-col gap-4 rounded-2xl bg-red-50 p-5 ring-1 ring-red-200 sm:flex-row sm:items-center">
          <Archive className="h-8 w-8 shrink-0 text-red-600" />
          <div className="flex-1 text-sm text-red-900">
            <p className="font-bold">Pérdida total (PT) desde el {formatearFecha(unidad.pt_fecha, true)}{unidad.pt_registrado_por ? ` · ${unidad.pt_registrado_por}` : ''}</p>
            {unidad.pt_motivo && <p className="mt-1">«{unidad.pt_motivo}»</p>}
            <p className="mt-1 text-xs text-red-700">No aparece en Unidades. Su inventario y fotos se conservan.</p>
          </div>
          <button onClick={restaurar} disabled={procesandoPT} className={claseBotonSecundario}>
            {procesandoPT ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Regresar a Unidades
          </button>
        </div>
      ) : (
        /* Fase actual: lo que hay que hacer ahora */
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

            {/* Unidades que no se liberan: pérdida total */}
            {FASES_PT.includes(unidad.estado_unidad) && (
              <div className="border-t border-slate-100 pt-4">
                {formPT ? (
                  <div className="space-y-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
                    <p className="text-sm text-red-900">
                      <strong>{unidad.unidad_eco}</strong> saldrá de Unidades y quedará en el apartado <strong>Pérdida total (PT)</strong> con su inventario y fotos.
                      {qrColocados > 0 && ` Ojo: tiene ${qrColocados} QR colocado(s) que se deben retirar.`}
                    </p>
                    <textarea rows={2} value={motivoPT} onChange={(e) => setMotivoPT(e.target.value)} placeholder="Motivo (opcional): p. ej. aseguradora la declaró pérdida total" className="w-full rounded-xl border-0 bg-white px-3 py-2 text-sm ring-1 ring-red-200 focus:outline-none focus:ring-2 focus:ring-red-400" />
                    <div className="flex gap-2">
                      <button onClick={() => setFormPT(false)} className={claseBotonSecundario}>Cancelar</button>
                      <button onClick={mandarAPT} disabled={procesandoPT} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                        {procesandoPT ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Mandar a PT
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setFormPT(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 hover:underline">
                    <Archive className="h-4 w-4" /> No se liberó: mandar a pérdida total (PT)
                  </button>
                )}
              </div>
            )}
          </div>
        </Tarjeta>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta
          titulo="Datos de la unidad"
          icono={Truck}
          acciones={
            <button onClick={() => setEditando(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline">
              <Pencil className="h-4 w-4" /> Editar
            </button>
          }
        >
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
                <dd className={`text-right font-medium ${valor && valor !== '—' ? 'text-slate-900' : 'text-slate-300'}`}>{valor || '—'}</dd>
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

      {editando && (
        <FormularioUnidad
          unidad={unidad}
          cerrar={() => setEditando(false)}
          alGuardar={(u) => {
            actualizarUnidad(u);
            setEditando(false);
            aviso.exito('Datos de la unidad actualizados.');
          }}
        />
      )}
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
