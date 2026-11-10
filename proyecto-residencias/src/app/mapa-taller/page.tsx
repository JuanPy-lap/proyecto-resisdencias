'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Hand,
  Loader2,
  MapPinned,
  MapPinOff,
  QrCode,
  ScanLine,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { getEtiquetasQR, getUnidades, moverEtiquetaQR } from '@/services/api';
import { mensajeDeError, useAviso, useDatos } from '@/lib/hooks';
import { claseEstadoUnidad, formatearFecha, situacionRetiro } from '@/lib/constantes';
import {
  AREAS_PLANO,
  ESTILO_ALERTA,
  ZONAS_PLANO,
  areaDeUbicacion,
  nivelAlerta,
  valorUbicacion,
  type AreaPlano,
  type NivelAlerta,
} from '@/lib/plano';
import PlanoTaller, { nivelDeArea } from '@/components/PlanoTaller';
import type { EtiquetaQRConUnidad } from '@/types/supabase';
import {
  Aviso,
  AvisoConfiguracion,
  Cargando,
  Encabezado,
  ErrorCarga,
  Estadistica,
  Insignia,
  Pagina,
  Tarjeta,
  claseInput,
} from '@/components/ui';

const ACTUALIZAR_CADA_MS = 60_000;

export default function MapaTallerPage() {
  const aviso = useAviso();
  const [areaSel, setAreaSel] = useState<string | null>(null);
  const [qrSel, setQrSel] = useState<string | null>(null);
  const [modoMover, setModoMover] = useState(false);
  const [moviendo, setMoviendo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);

  const datos = useDatos(() => Promise.all([getEtiquetasQR(), getUnidades()]));
  const [etiquetas, unidades] = datos.datos ?? [[], []];
  const { recargar } = datos;

  // El mapa se mantiene al día solo (útil en una pantalla fija en la oficina).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') recargar();
    }, ACTUALIZAR_CADA_MS);
    return () => clearInterval(id);
  }, [recargar]);

  // --- Clasificar los QR colocados por área del plano -----------------------
  const colocadas = etiquetas.filter((q) => q.estado === 'Colocada');
  const todosPorArea = new Map<string, EtiquetaQRConUnidad[]>();
  const sinArea: EtiquetaQRConUnidad[] = [];
  for (const q of colocadas) {
    const area = areaDeUbicacion(q.ubicacion_rack);
    if (area) todosPorArea.set(area.id, [...(todosPorArea.get(area.id) ?? []), q]);
    else sinArea.push(q);
  }
  // "Solo alertas" oculta en el plano los QR que van en tiempo.
  const porArea = soloAlertas
    ? new Map([...todosPorArea].map(([id, qrs]) => [id, qrs.filter((q) => nivelAlerta(q) !== 'ok')] as const).filter(([, qrs]) => qrs.length > 0))
    : todosPorArea;

  const conQr = new Set(colocadas.map((q) => q.unidad_id));
  const sinQr = unidades.filter((u) => u.estado_unidad !== 'Entrega' && !conQr.has(u.id));
  const criticos = colocadas.filter((q) => nivelAlerta(q) === 'critico').length;
  const ocupadas = todosPorArea.size;

  // --- Búsqueda por cono -----------------------------------------------------
  const texto = busqueda.trim().toUpperCase();
  const coincidencias = texto
    ? colocadas.filter((q) => q.codigo_qr.toUpperCase().includes(texto) || q.unidades?.unidad_eco.toUpperCase().includes(texto))
    : [];
  const resaltadas = texto ? new Set(coincidencias.map((q) => areaDeUbicacion(q.ubicacion_rack)?.id).filter((id): id is string => Boolean(id))) : null;

  const qrElegido = colocadas.find((q) => q.id === qrSel) ?? null;
  const areaElegida = AREAS_PLANO.find((a) => a.id === areaSel) ?? null;

  // --- Acciones --------------------------------------------------------------
  const elegirQr = (q: EtiquetaQRConUnidad) => {
    setQrSel(q.id);
    setAreaSel(areaDeUbicacion(q.ubicacion_rack)?.id ?? null);
    setModoMover(false);
  };

  const mover = async (q: EtiquetaQRConUnidad, area: AreaPlano) => {
    if (areaDeUbicacion(q.ubicacion_rack)?.id === area.id) {
      setModoMover(false);
      return;
    }
    setMoviendo(true);
    try {
      const actualizada = await moverEtiquetaQR(q.id, q.taller, valorUbicacion(area));
      datos.setDatos([etiquetas.map((x) => (x.id === q.id ? { ...x, ...actualizada } : x)), unidades]);
      aviso.exito(`Cono ${q.unidades?.unidad_eco ?? q.codigo_qr} (${q.taller}) movido a ${area.nombre}.`);
      setAreaSel(area.id);
      setModoMover(false);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setMoviendo(false);
    }
  };

  const tocarArea = (area: AreaPlano) => {
    if (modoMover && qrElegido) {
      void mover(qrElegido, area);
      return;
    }
    setAreaSel(area.id === areaSel ? null : area.id);
    setQrSel(null);
  };

  const buscar = (valor: string) => {
    setBusqueda(valor);
    const t = valor.trim().toUpperCase();
    // Si el cono es exacto y único, se selecciona directo.
    const exactas = colocadas.filter((q) => q.unidades?.unidad_eco.toUpperCase() === t || q.codigo_qr.toUpperCase() === t);
    if (t && exactas.length === 1) elegirQr(exactas[0]);
  };

  return (
    <Pagina>
      <Encabezado
        icono={MapPinned}
        seccion="Patio"
        titulo="Mapa del taller"
        descripcion="Plano real de la empresa. Cada taller se ilumina según el QR más urgente que tiene dentro; toca un taller o un cono para ver el detalle."
      />

      <AvisoConfiguracion />
      {datos.error && <ErrorCarga mensaje={datos.error} reintentar={datos.recargar} />}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Estadistica etiqueta="QR colocados" valor={colocadas.length} detalle="En los talleres del plano" icono={ScanLine} tono="amber" />
        <Estadistica etiqueta="Talleres ocupados" valor={`${ocupadas}/${AREAS_PLANO.length}`} detalle="Con al menos una unidad" icono={Building2} tono="sky" />
        <Estadistica etiqueta="Retirar ya" valor={criticos} detalle="Vencidos, para hoy o unidad de salida" icono={AlertTriangle} tono={criticos ? 'red' : 'emerald'} />
        <Estadistica etiqueta="Sin ubicar" valor={sinArea.length} detalle="QR con taller no reconocido" icono={MapPinOff} tono={sinArea.length ? 'amber' : 'slate'} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Tarjeta sinPadding className="overflow-hidden">
          {/* Barra de herramientas */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => buscar(e.target.value)}
                placeholder="Buscar no. de cono…"
                inputMode="numeric"
                className={`${claseInput} pl-9 font-mono`}
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700" aria-label="Limpiar búsqueda">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} className="h-4 w-4 accent-amber-500" />
              Solo alertas
            </label>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
              {(Object.keys(ESTILO_ALERTA) as NivelAlerta[]).map((n) => (
                <span key={n} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ESTILO_ALERTA[n].color }} />
                  {ESTILO_ALERTA[n].etiqueta}
                </span>
              ))}
            </div>
          </div>

          {texto && (
            <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {coincidencias.length === 0
                ? `Ningún QR colocado con el cono "${texto}".`
                : `${coincidencias.length} QR con "${texto}" en ${resaltadas?.size ?? 0} taller(es).`}
            </p>
          )}

          {modoMover && qrElegido && (
            <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">
              <span className="flex items-center gap-2">
                {moviendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hand className="h-4 w-4" />}
                Toca el taller a donde se movió el cono {qrElegido.unidades?.unidad_eco ?? qrElegido.codigo_qr} ({qrElegido.taller})
              </span>
              <button onClick={() => setModoMover(false)} className="rounded-lg bg-slate-950/10 px-2 py-1 hover:bg-slate-950/20">
                Cancelar
              </button>
            </div>
          )}

          {datos.cargando ? (
            <Cargando texto="Cargando plano…" />
          ) : (
            <div className="overflow-x-auto bg-slate-950">
              <PlanoTaller
                porArea={porArea}
                areaSeleccionada={areaSel}
                qrSeleccionado={qrSel}
                resaltadas={resaltadas}
                modoMover={modoMover}
                alTocarArea={tocarArea}
                alTocarQr={elegirQr}
              />
            </div>
          )}
          <p className="px-4 py-2 text-xs text-slate-400 xl:hidden">Desliza el plano hacia los lados para ver todos los talleres.</p>
        </Tarjeta>

        <div className="space-y-6">
          {qrElegido ? (
            <DetalleQr
              q={qrElegido}
              moviendo={moviendo}
              modoMover={modoMover}
              activarMover={() => setModoMover(true)}
              moverA={(area) => mover(qrElegido, area)}
              cerrar={() => setQrSel(null)}
            />
          ) : areaElegida ? (
            <DetalleArea area={areaElegida} qrs={todosPorArea.get(areaElegida.id) ?? []}elegirQr={elegirQr} cerrar={() => setAreaSel(null)} />
          ) : (
            <Tarjeta titulo="Ocupación por zona" icono={Building2}>
              <p className="mb-4 text-sm text-slate-500">Toca un taller del plano para ver qué unidades tiene, o un cono para moverlo.</p>
              <ul className="space-y-3">
                {ZONAS_PLANO.map((zona) => {
                  const areas = AREAS_PLANO.filter((a) => a.zona === zona);
                  const usadas = areas.filter((a) => todosPorArea.has(a.id)).length;
                  return (
                    <li key={zona}>
                      <div className="mb-1 flex justify-between text-sm font-semibold text-slate-700">
                        <span>{zona}</span>
                        <span className="tabular-nums text-slate-500">
                          {usadas}/{areas.length}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(usadas / areas.length) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Tarjeta>
          )}

          {sinArea.length > 0 && (
            <Tarjeta titulo={`QR sin ubicar en el plano (${sinArea.length})`} icono={MapPinOff}>
              <p className="mb-3 text-xs text-slate-500">Su ubicación escrita no corresponde a ningún taller. Elige uno y toca el plano para acomodarlo.</p>
              <ul className="space-y-2">
                {sinArea.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="font-mono font-bold">{q.unidades?.unidad_eco ?? q.codigo_qr}</span>
                      <span className="text-slate-500"> · {q.taller}{q.ubicacion_rack ? ` · “${q.ubicacion_rack}”` : ''}</span>
                    </span>
                    <button
                      onClick={() => {
                        elegirQr(q);
                        setModoMover(true);
                      }}
                      className="shrink-0 text-xs font-semibold text-amber-600 hover:underline"
                    >
                      Ubicar
                    </button>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          <Tarjeta titulo={`Unidades sin QR (${sinQr.length})`} icono={QrCode}>
            {sinQr.length === 0 ? (
              <p className="text-sm text-slate-500">Todas las unidades activas tienen QR colocado.</p>
            ) : (
              <ul className="space-y-2">
                {sinQr.slice(0, 8).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-mono font-bold">{u.unidad_eco}</span>
                    <Link href={`/qr-supervision?unidad=${u.id}`} className="text-xs font-semibold text-amber-600 hover:underline">
                      Colocar QR
                    </Link>
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

function DetalleArea({
  area,
  qrs,
  elegirQr,
  cerrar,
}: {
  area: AreaPlano;
  qrs: EtiquetaQRConUnidad[];
  elegirQr: (q: EtiquetaQRConUnidad) => void;
  cerrar: () => void;
}) {
  const nivel = nivelDeArea(qrs);
  return (
    <Tarjeta titulo={area.nombre} icono={Building2}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Insignia clase="bg-slate-100 text-slate-600 ring-slate-200">{area.zona}</Insignia>
        {nivel && <Insignia clase={ESTILO_ALERTA[nivel].insignia}>{ESTILO_ALERTA[nivel].etiqueta}</Insignia>}
        {area.porConfirmar && <Insignia clase="bg-amber-50 text-amber-700 ring-amber-200">Nombre por confirmar</Insignia>}
        <button onClick={cerrar} className="ml-auto text-xs font-semibold text-slate-400 hover:text-slate-700">
          Cerrar
        </button>
      </div>
      {qrs.length === 0 ? (
        <p className="text-sm text-slate-500">Sin unidades en este taller.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {qrs.map((q) => {
            const n = nivelAlerta(q);
            const retiro = situacionRetiro(q);
            return (
              <li key={q.id}>
                <button onClick={() => elegirQr(q)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ESTILO_ALERTA[n].color }} />
                  <span className="flex-1">
                    <span className="block font-mono font-bold text-slate-900">{q.unidades?.unidad_eco ?? q.codigo_qr}</span>
                    <span className="text-xs text-slate-500">
                      {q.taller}
                      {retiro ? ` · ${retiro.texto}` : ''}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}

function DetalleQr({
  q,
  moviendo,
  modoMover,
  activarMover,
  moverA,
  cerrar,
}: {
  q: EtiquetaQRConUnidad;
  moviendo: boolean;
  modoMover: boolean;
  activarMover: () => void;
  moverA: (area: AreaPlano) => void;
  cerrar: () => void;
}) {
  const area = areaDeUbicacion(q.ubicacion_rack);
  const n = nivelAlerta(q);
  const retiro = situacionRetiro(q);

  return (
    <Tarjeta titulo="Unidad seleccionada" icono={Truck}>
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xl font-black">{q.unidades?.unidad_eco ?? q.codigo_qr}</span>
            {q.unidades && <Insignia clase={claseEstadoUnidad(q.unidades.estado_unidad)}>{q.unidades.estado_unidad}</Insignia>}
            <button onClick={cerrar} className="ml-auto text-xs font-semibold text-slate-400 hover:text-slate-700">
              Cerrar
            </button>
          </div>
          <p className="mt-1 flex items-center gap-1 font-mono text-xs text-slate-500">
            <QrCode className="h-3.5 w-3.5" /> QR {q.codigo_qr} · {q.taller}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Ubicación</dt>
            <dd className="font-semibold text-slate-800">{area?.nombre ?? q.ubicacion_rack ?? 'Sin ubicación'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Colocado</dt>
            <dd className="font-semibold text-slate-800">{formatearFecha(q.fecha_colocacion)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-slate-400">Retiro</dt>
            <dd className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">{formatearFecha(q.fecha_retiro_programada)}</span>
              <Insignia clase={retiro?.clase ?? ESTILO_ALERTA[n].insignia}>{retiro?.texto ?? ESTILO_ALERTA[n].etiqueta}</Insignia>
            </dd>
          </div>
        </dl>

        <button onClick={activarMover} disabled={moviendo || modoMover} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {moviendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hand className="h-4 w-4" />}
          {modoMover ? 'Toca el taller destino en el plano' : 'Mover tocando el plano'}
        </button>

        <select
            defaultValue=""
            onChange={(e) => {
              const destino = AREAS_PLANO.find((a) => a.id === e.target.value);
              if (destino) moverA(destino);
              e.target.value = '';
            }}
            disabled={moviendo}
            className={claseInput}
            aria-label="Mover a otro taller"
          >
            <option value="" disabled>
              …o elige el taller de la lista
            </option>
            {ZONAS_PLANO.map((zona) => (
              <optgroup key={zona} label={zona}>
                {AREAS_PLANO.filter((a) => a.zona === zona).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>

        {q.unidades && (
          <Link href={`/unidades/${q.unidades.id}`} className="flex items-center justify-center gap-1 text-sm font-semibold text-amber-600 hover:underline">
            Abrir expediente <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </Tarjeta>
  );
}
