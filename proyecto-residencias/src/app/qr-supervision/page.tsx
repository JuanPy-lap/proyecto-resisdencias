'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck, Plus, QrCode, ScanLine, Search, ShieldAlert, Undo2 } from 'lucide-react';
import { cambiarEstadoQR, crearEtiquetaQR, getEtiquetasQR, getUnidades } from '@/services/api';
import { mensajeDeError, nombreUsuario, useAviso, useDatos, useUsuario } from '@/lib/hooks';
import { ESTADOS_QR, ESTADOS_SALIDA, TALLERES, formatearFecha } from '@/lib/constantes';
import type { EstadoQR, EtiquetaQRConUnidad } from '@/types/supabase';
import SelectorUnidad from '@/components/SelectorUnidad';
import {
  Aviso,
  AvisoConfiguracion,
  Campo,
  Cargando,
  Encabezado,
  ErrorCarga,
  Estadistica,
  Insignia,
  Pagina,
  Tarjeta,
  Vacio,
  claseBotonAcento,
  claseInput,
} from '@/components/ui';

function esCritica(q: EtiquetaQRConUnidad) {
  return q.estado === 'Colocada' && !!q.unidades && ESTADOS_SALIDA.includes(q.unidades.estado_unidad);
}

function ModuloQR() {
  const params = useSearchParams();
  const usuario = useUsuario();
  const aviso = useAviso();

  const [unidadId, setUnidadId] = useState(params.get('unidad') ?? '');
  const [codigo, setCodigo] = useState('');
  const [taller, setTaller] = useState(TALLERES[0].nombre);
  const [rack, setRack] = useState('');
  const [colocarYa, setColocarYa] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<EstadoQR | 'Activas' | 'Todas'>('Activas');
  const [procesando, setProcesando] = useState<string | null>(null);

  const unidades = useDatos(getUnidades);
  const etiquetas = useDatos(() => getEtiquetasQR());
  const lista = etiquetas.datos ?? [];

  const criticas = lista.filter(esCritica);
  const texto = busqueda.trim().toUpperCase();
  const visibles = lista
    .filter((q) => (filtro === 'Todas' ? true : filtro === 'Activas' ? q.estado !== 'Retirada' : q.estado === filtro))
    .filter((q) => !texto || q.codigo_qr.includes(texto) || q.unidades?.unidad_eco.includes(texto))
    .sort((a, b) => Number(esCritica(b)) - Number(esCritica(a)));

  const registrar = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!unidadId || !codigo.trim()) return aviso.error('Selecciona la unidad y escanea o escribe el código QR.');
    setGuardando(true);
    try {
      const nueva = await crearEtiquetaQR({
        unidad_id: unidadId,
        codigo_qr: codigo,
        taller,
        ubicacion_rack: rack.trim() || null,
        estado: colocarYa ? 'Colocada' : 'Pendiente',
      });
      const unidad = unidades.datos?.find((u) => u.id === unidadId);
      etiquetas.setDatos((prev) => [
        { ...nueva, unidades: unidad ? { id: unidad.id, unidad_eco: unidad.unidad_eco, estado_unidad: unidad.estado_unidad } : null },
        ...(prev ?? []),
      ]);
      aviso.exito(`Etiqueta ${nueva.codigo_qr} registrada para ${unidad?.unidad_eco}.`);
      setCodigo('');
      setRack('');
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (q: EtiquetaQRConUnidad, estado: EstadoQR) => {
    setProcesando(q.id);
    try {
      const actualizada = await cambiarEstadoQR(q.id, estado, nombreUsuario(usuario));
      etiquetas.setDatos((prev) => (prev ?? []).map((x) => (x.id === q.id ? { ...x, ...actualizada } : x)));
      aviso.exito(`QR ${q.codigo_qr} marcada como ${estado.toLowerCase()}.`);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setProcesando(null);
    }
  };

  return (
    <Pagina>
      <Encabezado
        icono={QrCode}
        seccion="Rastreo"
        titulo="Supervisión de etiquetas QR"
        descripcion="Cada QR identifica la unidad dentro del taller. Ninguna unidad debe liberarse con una etiqueta colocada."
      />

      <AvisoConfiguracion />
      {etiquetas.error && <ErrorCarga mensaje={etiquetas.error} reintentar={etiquetas.recargar} />}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Estadistica etiqueta="Colocadas" valor={lista.filter((q) => q.estado === 'Colocada').length} detalle="Unidades rastreadas" icono={ScanLine} tono="amber" />
        <Estadistica etiqueta="Pendientes de colocar" valor={lista.filter((q) => q.estado === 'Pendiente').length} detalle="Impresas, sin colocar" icono={QrCode} tono="sky" />
        <Estadistica etiqueta="Alertas de salida" valor={criticas.length} detalle="QR en unidades por liberar" icono={ShieldAlert} tono={criticas.length ? 'red' : 'emerald'} />
        <Estadistica etiqueta="Retiradas" valor={lista.filter((q) => q.estado === 'Retirada').length} detalle="Ciclo completo" icono={PackageCheck} tono="emerald" />
      </section>

      {criticas.length > 0 && (
        <div className="rounded-2xl bg-red-600 p-5 text-white shadow-lg shadow-red-600/20">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-5 w-5" /> {criticas.length} etiqueta(s) deben retirarse antes de la salida
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {criticas.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/20">
                <div className="min-w-0">
                  <p className="font-mono font-bold">{q.unidades?.unidad_eco} · {q.codigo_qr}</p>
                  <p className="truncate text-xs text-red-100">{q.unidades?.estado_unidad} · {q.taller}{q.ubicacion_rack ? ` / ${q.ubicacion_rack}` : ''}</p>
                </div>
                <button onClick={() => cambiarEstado(q, 'Retirada')} disabled={procesando === q.id} className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">
                  {procesando === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Retirar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Tarjeta titulo="Registrar etiqueta" icono={Plus} className="lg:sticky lg:top-24 lg:self-start">
          <form onSubmit={registrar} className="space-y-4">
            <Campo etiqueta="Unidad *">
              <SelectorUnidad unidades={unidades.datos ?? []} valor={unidadId} cambiar={setUnidadId} />
            </Campo>
            <Campo etiqueta="Código QR *" ayuda="Con lector USB/Bluetooth, enfoca el campo y escanea.">
              <div className="relative">
                <ScanLine className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="QR-000123" className={`${claseInput} pl-10 font-mono uppercase`} />
              </div>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Área">
                <select value={taller} onChange={(e) => setTaller(e.target.value)} className={claseInput}>
                  {TALLERES.map((t) => <option key={t.nombre}>{t.nombre}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Rack / cajón">
                <input value={rack} onChange={(e) => setRack(e.target.value)} placeholder="A1" className={`${claseInput} uppercase`} />
              </Campo>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={colocarYa} onChange={(e) => setColocarYa(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
              Ya está colocada en la unidad
            </label>
            <button type="submit" disabled={guardando} className={`${claseBotonAcento} w-full`}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Registrar etiqueta
            </button>
          </form>
        </Tarjeta>

        <Tarjeta sinPadding>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escanea o busca código / económico" className={`${claseInput} pl-10`} />
            </div>
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {(['Activas', ...ESTADOS_QR.map((e) => e.valor), 'Todas'] as const).map((f) => (
                <button key={f} onClick={() => setFiltro(f)} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 transition ${filtro === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {etiquetas.cargando ? (
            <Cargando />
          ) : visibles.length === 0 ? (
            <div className="p-5">
              <Vacio icono={QrCode} titulo={lista.length ? 'Sin coincidencias' : 'No hay etiquetas registradas'} texto={lista.length ? 'Cambia el filtro o la búsqueda.' : 'Registra la primera etiqueta con el formulario.'} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibles.map((q) => {
                const critica = esCritica(q);
                return (
                  <li key={q.id} className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center ${critica ? 'bg-red-50/60' : ''}`}>
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${critica ? 'bg-red-600 text-white' : 'bg-slate-900 text-amber-400'}`}>
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{q.codigo_qr}</span>
                        <Insignia clase={ESTADOS_QR.find((e) => e.valor === q.estado)?.clase ?? ''}>{q.estado}</Insignia>
                        {critica && <Insignia clase="bg-red-100 text-red-700 ring-red-200">¡Retirar!</Insignia>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {q.unidades ? (
                          <Link href={`/unidades/${q.unidades.id}`} className="font-mono font-semibold text-slate-700 hover:underline">{q.unidades.unidad_eco}</Link>
                        ) : '—'}
                        {q.unidades && ` (${q.unidades.estado_unidad})`} · {q.taller}{q.ubicacion_rack ? ` / ${q.ubicacion_rack}` : ''}
                        {q.estado === 'Colocada' && ` · colocada ${formatearFecha(q.fecha_colocacion, true)}`}
                        {q.estado === 'Retirada' && ` · retirada ${formatearFecha(q.fecha_retiro, true)} por ${q.retirado_por ?? '—'}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {procesando === q.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                      ) : q.estado === 'Pendiente' ? (
                        <button onClick={() => cambiarEstado(q, 'Colocada')} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400">
                          <ScanLine className="h-4 w-4" /> Colocar
                        </button>
                      ) : q.estado === 'Colocada' ? (
                        <button onClick={() => cambiarEstado(q, 'Retirada')} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
                          <CheckCircle2 className="h-4 w-4" /> Retirar
                        </button>
                      ) : (
                        <button onClick={() => cambiarEstado(q, 'Colocada')} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
                          <Undo2 className="h-4 w-4" /> Volver a colocar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
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
