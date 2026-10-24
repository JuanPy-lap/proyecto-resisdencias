'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, Loader2, PackageCheck, QrCode, ScanLine, Search, Trash2, X } from 'lucide-react';
import { crearEtiquetaQR, eliminarEtiquetaQR, getEtiquetasQR, getUnidades, retirarEtiquetaQR } from '@/services/api';
import { mensajeDeError, nombreUsuario, useAviso, useDatos, useUsuario } from '@/lib/hooks';
import { ESTADOS_QR, ESTADOS_SALIDA, TALLERES, formatearFecha, hoyISO, situacionRetiro } from '@/lib/constantes';
import type { EtiquetaQRConUnidad } from '@/types/supabase';
import SelectorUnidad from '@/components/SelectorUnidad';
import { Aviso, AvisoConfiguracion, Campo, Cargando, Encabezado, ErrorCarga, Estadistica, Insignia, Pagina, Tarjeta, Vacio, claseBotonAcento, claseInput } from '@/components/ui';

type Pestana = 'Activas' | 'Colocadas' | 'Retiradas';

const PESTANAS: { valor: Pestana; ayuda: string }[] = [
  { valor: 'Activas', ayuda: 'Colocadas y aún en tiempo' },
  { valor: 'Colocadas', ayuda: 'Todas las que siguen puestas' },
  { valor: 'Retiradas', ayuda: 'Historial de retiros' },
];

/** QR colocado en una unidad que ya va de salida: hay que retirarlo ya. */
function esDeSalida(q: EtiquetaQRConUnidad) {
  return q.estado === 'Colocada' && !!q.unidades && ESTADOS_SALIDA.includes(q.unidades.estado_unidad);
}

function urgente(q: EtiquetaQRConUnidad) {
  const s = situacionRetiro(q);
  return esDeSalida(q) || s?.tipo === 'vencido' || s?.tipo === 'hoy';
}

function enPestana(p: Pestana, q: EtiquetaQRConUnidad) {
  if (p === 'Retiradas') return q.estado === 'Retirada';
  if (p === 'Colocadas') return q.estado !== 'Retirada';
  return q.estado !== 'Retirada' && !urgente(q);
}

function ModuloQR() {
  const router = useRouter();
  const params = useSearchParams();
  const usuario = useUsuario();
  const aviso = useAviso();

  const filtroUnidad = params.get('unidad') ?? '';
  const [unidadId, setUnidadId] = useState(filtroUnidad);
  // Vacío = usar el valor sugerido (cono de la unidad / su fecha compromiso).
  const [codigo, setCodigo] = useState('');
  const [taller, setTaller] = useState(TALLERES[0].nombre);
  const [rack, setRack] = useState('');
  const [fechaColocacion, setFechaColocacion] = useState(hoyISO());
  const [fechaRetiro, setFechaRetiro] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pestana, setPestana] = useState<Pestana>('Colocadas');
  const [procesando, setProcesando] = useState<string | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null);

  const unidades = useDatos(getUnidades);
  const etiquetas = useDatos(() => getEtiquetasQR());
  const lista = etiquetas.datos ?? [];
  // Solo se colocan QR a unidades que siguen en el taller.
  const unidadesActivas = (unidades.datos ?? []).filter((u) => u.estado_unidad !== 'Entrega');
  const unidad = unidades.datos?.find((u) => u.id === unidadId);
  const unidadFiltro = unidades.datos?.find((u) => u.id === filtroUnidad);

  const codigoFinal = codigo || unidad?.unidad_eco || '';
  const retiroFinal = fechaRetiro || unidad?.fecha_compromiso || '';

  const colocadas = lista.filter((q) => q.estado === 'Colocada');
  const deLaUnidad = lista.filter((q) => !filtroUnidad || q.unidad_id === filtroUnidad);
  const texto = busqueda.trim().toUpperCase();
  const visibles = deLaUnidad
    .filter((q) => enPestana(pestana, q))
    .filter((q) => !texto || q.codigo_qr.includes(texto) || q.unidades?.unidad_eco.includes(texto) || q.taller.toUpperCase().includes(texto))
    .sort((a, b) =>
      pestana === 'Retiradas'
        ? (b.fecha_retiro ?? '').localeCompare(a.fecha_retiro ?? '')
        : Number(urgente(b)) - Number(urgente(a)) || (a.fecha_retiro_programada ?? '9').localeCompare(b.fecha_retiro_programada ?? '9')
    );

  const urgentes = colocadas.filter(urgente);
  const cuenta = (p: Pestana) => deLaUnidad.filter((q) => enPestana(p, q)).length;

  const cambiarUnidad = (id: string) => {
    setUnidadId(id);
    setCodigo('');
    setFechaRetiro('');
  };

  const registrar = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!unidad) return aviso.error('Selecciona la unidad.');
    if (!codigoFinal.trim()) return aviso.error('Escribe o escanea el número de cono del QR.');
    if (!retiroFinal) return aviso.error('Indica la fecha en que se debe retirar el QR.');
    if (retiroFinal < fechaColocacion) return aviso.error('La fecha de retiro no puede ser antes de la de colocación.');

    setGuardando(true);
    try {
      const nueva = await crearEtiquetaQR({
        unidad_id: unidad.id,
        codigo_qr: codigoFinal,
        taller,
        ubicacion_rack: rack.trim().toUpperCase() || null,
        // Mediodía local para que la fecha elegida no se recorra por zona horaria.
        fecha_colocacion: new Date(`${fechaColocacion}T12:00:00`).toISOString(),
        fecha_retiro_programada: retiroFinal,
      });
      etiquetas.setDatos((prev) => [
        { ...nueva, unidades: { id: unidad.id, unidad_eco: unidad.unidad_eco, estado_unidad: unidad.estado_unidad, fecha_compromiso: unidad.fecha_compromiso } },
        ...(prev ?? []),
      ]);
      aviso.exito(`QR ${nueva.codigo_qr} colocado en ${taller}. Retirar el ${formatearFecha(retiroFinal)}.`);
      setRack('');
      setPestana('Colocadas');
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const retirar = async (q: EtiquetaQRConUnidad) => {
    setProcesando(q.id);
    try {
      const actualizada = await retirarEtiquetaQR(q.id, nombreUsuario(usuario));
      etiquetas.setDatos((prev) => (prev ?? []).map((x) => (x.id === q.id ? { ...x, ...actualizada } : x)));
      aviso.exito(`QR ${q.codigo_qr} (${q.taller}) retirado.`);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setProcesando(null);
    }
  };

  const eliminar = async (q: EtiquetaQRConUnidad) => {
    setProcesando(q.id);
    try {
      await eliminarEtiquetaQR(q.id);
      etiquetas.setDatos((prev) => (prev ?? []).filter((x) => x.id !== q.id));
      aviso.exito(`Registro del QR ${q.codigo_qr} (${q.taller}) eliminado.`);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setProcesando(null);
      setConfirmarBorrado(null);
    }
  };

  return (
    <Pagina>
      {unidadFiltro && (
        <Link href={`/unidades/${unidadFiltro.id}?hecho=qr`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Volver a {unidadFiltro.unidad_eco}
        </Link>
      )}
      <Encabezado icono={QrCode} seccion="Rastreo" titulo="Etiquetas QR" descripcion="Un QR por taller con el número de cono. Cada uno con su fecha de colocación y de retiro." />
      <AvisoConfiguracion />
      {etiquetas.error && <ErrorCarga mensaje={etiquetas.error} reintentar={etiquetas.recargar} />}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Estadistica etiqueta="Colocadas" valor={colocadas.length} detalle="QR puestos en racks" icono={ScanLine} tono="amber" />
        <Estadistica etiqueta="Retirar hoy" valor={colocadas.filter((q) => situacionRetiro(q)?.tipo === 'hoy').length} detalle="Según fecha programada" icono={CalendarClock} tono="sky" />
        <Estadistica etiqueta="Retiro vencido" valor={colocadas.filter((q) => situacionRetiro(q)?.tipo === 'vencido').length} detalle="Ya pasó su fecha" icono={AlertTriangle} tono={urgentes.length ? 'red' : 'emerald'} />
        <Estadistica etiqueta="Retiradas" valor={lista.filter((q) => q.estado === 'Retirada').length} detalle="Ciclo completo" icono={PackageCheck} tono="emerald" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Tarjeta titulo="Colocar QR" icono={ScanLine} className="lg:sticky lg:top-24 lg:self-start">
          <form onSubmit={registrar} className="space-y-4">
            <Campo etiqueta="Unidad *">
              <SelectorUnidad unidades={unidadesActivas} valor={unidadId} cambiar={cambiarUnidad} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="No. de cono *">
                <input value={codigoFinal} onChange={(e) => setCodigo(e.target.value)} placeholder="C-2499" className={`${claseInput} font-mono uppercase`} />
              </Campo>
              <Campo etiqueta="Taller *">
                <select value={taller} onChange={(e) => setTaller(e.target.value)} className={claseInput}>
                  {TALLERES.map((t) => <option key={t.nombre}>{t.nombre}</option>)}
                </select>
              </Campo>
            </div>
            <Campo etiqueta="Rack / ubicación">
              <input value={rack} onChange={(e) => setRack(e.target.value)} placeholder="A1" className={`${claseInput} uppercase`} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Se colocó el *">
                <input type="date" required value={fechaColocacion} max={hoyISO()} onChange={(e) => setFechaColocacion(e.target.value)} className={claseInput} />
              </Campo>
              <Campo etiqueta="Retirar el *">
                <input type="date" required value={retiroFinal} min={fechaColocacion} onChange={(e) => setFechaRetiro(e.target.value)} className={claseInput} />
              </Campo>
            </div>
            <p className="-mt-2 text-xs text-slate-400">
              {unidad?.fecha_compromiso
                ? `Sugerida por la fecha compromiso de ${unidad.unidad_eco} (${formatearFecha(unidad.fecha_compromiso)}).`
                : unidad
                  ? `${unidad.unidad_eco} no tiene fecha compromiso: indica la fecha de retiro.`
                  : 'La fecha de retiro se toma de la fecha compromiso de la unidad.'}
            </p>
            <button type="submit" disabled={guardando} className={`${claseBotonAcento} w-full`}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Registrar QR colocado
            </button>
          </form>
        </Tarjeta>

        <div className="space-y-4">
          {urgentes.length > 0 && (
            <div className="rounded-2xl bg-red-600 p-4 text-white shadow-lg shadow-red-600/20">
              <p className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-5 w-5" /> {urgentes.length} QR por retirar ya
              </p>
              <p className="mt-1 text-sm text-red-100">
                {urgentes.slice(0, 6).map((q) => `${q.codigo_qr} (${q.taller}${q.ubicacion_rack ? ` / ${q.ubicacion_rack}` : ''})`).join(' · ')}
                {urgentes.length > 6 ? ' …' : ''}
              </p>
            </div>
          )}

          <Tarjeta sinPadding>
            <div className="space-y-3 border-b border-slate-100 p-4">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {PESTANAS.map((p) => (
                  <button key={p.valor} onClick={() => setPestana(p.valor)} className={`rounded-lg px-2 py-2 text-center transition ${pestana === p.valor ? 'bg-white shadow-sm' : 'text-slate-500'}`}>
                    <span className="block text-sm font-bold">{p.valor} ({cuenta(p.valor)})</span>
                    <span className="hidden text-[11px] text-slate-400 sm:block">{p.ayuda}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cono o taller" className={`${claseInput} pl-10`} />
                </div>
                {unidadFiltro && (
                  <button onClick={() => router.replace('/qr-supervision')} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                    Solo {unidadFiltro.unidad_eco} <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {etiquetas.cargando ? (
              <Cargando />
            ) : visibles.length === 0 ? (
              <div className="p-5">
                <Vacio icono={QrCode} titulo={`Sin QR ${pestana.toLowerCase()}`} />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visibles.map((q) => {
                  const situacion = situacionRetiro(q);
                  const salida = esDeSalida(q);
                  return (
                    <li key={q.id} className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center ${urgente(q) ? 'bg-red-50/60' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{q.codigo_qr}</span>
                          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{q.taller}</span>
                          {q.ubicacion_rack && <span className="text-xs font-semibold text-slate-500">Rack {q.ubicacion_rack}</span>}
                          {q.estado === 'Retirada' ? (
                            <Insignia clase={ESTADOS_QR.find((e) => e.valor === 'Retirada')!.clase}>Retirada</Insignia>
                          ) : salida ? (
                            <Insignia clase="bg-red-100 text-red-700 ring-red-200">Unidad en {q.unidades?.estado_unidad}</Insignia>
                          ) : (
                            situacion && <Insignia clase={situacion.clase}>{situacion.texto}</Insignia>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {q.unidades ? <Link href={`/unidades/${q.unidades.id}`} className="font-semibold text-slate-700 hover:underline">Unidad {q.unidades.unidad_eco}</Link> : '—'}
                          {' · '}colocado {formatearFecha(q.fecha_colocacion)}
                          {q.estado === 'Retirada'
                            ? ` · retirado ${formatearFecha(q.fecha_retiro, true)} por ${q.retirado_por ?? '—'}`
                            : ` · retirar ${formatearFecha(q.fecha_retiro_programada)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {procesando === q.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                        ) : confirmarBorrado === q.id ? (
                          <>
                            <span className="text-xs text-slate-500">¿Eliminar registro?</span>
                            <button onClick={() => eliminar(q)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500">Sí, eliminar</button>
                            <button onClick={() => setConfirmarBorrado(null)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">No</button>
                          </>
                        ) : (
                          <>
                            {q.estado !== 'Retirada' && (
                              <button onClick={() => retirar(q)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
                                <CheckCircle2 className="h-4 w-4" /> Retirar
                              </button>
                            )}
                            <button onClick={() => setConfirmarBorrado(q.id)} title="Eliminar registro" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>
      <Aviso aviso={aviso.aviso} cerrar={aviso.cerrar} />
    </Pagina>
  );
}

export default function QRSupervisionPage() {
  return (
    <Suspense fallback={<Pagina><Cargando /></Pagina>}>
      <ModuloQR />
    </Suspense>
  );
}
