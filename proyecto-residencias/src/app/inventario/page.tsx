'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardList, Fuel, Gauge, History, Loader2, MousePointerClick, Save, Trash2 } from 'lucide-react';
import { getInventarios, getUnidades, guardarInventarioCompleto } from '@/services/api';
import { mensajeDeError, nombreUsuario, useAviso, useDatos, useUsuario } from '@/lib/hooks';
import { TIPOS_DANO, VISTAS_DIAGRAMA, formatearFecha, infoTipoDano } from '@/lib/constantes';
import type { DanoDiagramaInsert, TipoDano, VistaDiagrama } from '@/types/supabase';
import SelectorUnidad from '@/components/SelectorUnidad';
import DiagramaCamion from '@/components/DiagramaCamion';
import {
  Aviso,
  AvisoConfiguracion,
  Cargando,
  Campo,
  Encabezado,
  ErrorCarga,
  Insignia,
  Pagina,
  Tarjeta,
  Vacio,
  claseBotonAcento,
  claseInput,
} from '@/components/ui';

type DanoBorrador = Omit<DanoDiagramaInsert, 'inventario_id'>;

const formularioVacio = {
  kilometraje: '',
  nivel_combustible: 50,
  tiene_gato_hidraulico: false,
  tiene_extintor: false,
  tiene_llanta_refaccion: false,
  observaciones_mecanicas: '',
  observaciones_carroceria: '',
};

const ACCESORIOS = [
  ['tiene_gato_hidraulico', 'Gato hidráulico'],
  ['tiene_extintor', 'Extintor'],
  ['tiene_llanta_refaccion', 'Llanta de refacción'],
] as const;

function ModuloInventario() {
  const router = useRouter();
  const params = useSearchParams();
  const usuario = useUsuario();
  const aviso = useAviso();

  const unidadId = params.get('unidad') ?? '';
  const [form, setForm] = useState(formularioVacio);
  const [danos, setDanos] = useState<DanoBorrador[]>([]);
  const [vista, setVista] = useState<VistaDiagrama>('lateral_izquierdo');
  const [tipo, setTipo] = useState<TipoDano>('golpe');
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const unidades = useDatos(getUnidades);
  const historial = useDatos(() => getInventarios());

  const ecoDe = (id: string) => unidades.datos?.find((u) => u.id === id)?.unidad_eco ?? '—';
  const indicesVista = danos.map((d, i) => (d.vista === vista ? i : -1)).filter((i) => i >= 0);

  const seleccionarUnidad = (id: string) => router.replace(id ? `/inventario?unidad=${id}` : '/inventario', { scroll: false });

  const agregarDano = (x: number, y: number) => {
    setDanos((d) => [...d, { posicion_x: x, posicion_y: y, vista, tipo_dano: tipo, descripcion: null }]);
    setSeleccionado(danos.length);
  };

  const editarDano = (i: number, cambios: Partial<DanoBorrador>) =>
    setDanos((d) => d.map((dano, j) => (j === i ? { ...dano, ...cambios } : dano)));

  const quitarDano = (i: number) => {
    setDanos((d) => d.filter((_, j) => j !== i));
    setSeleccionado(null);
  };

  const guardar = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!unidadId) return aviso.error('Selecciona la unidad a inventariar.');
    const km = Number(form.kilometraje.replace(/[^\d]/g, ''));
    if (!km) return aviso.error('Captura el kilometraje del odómetro.');

    setGuardando(true);
    try {
      const resultado = await guardarInventarioCompleto({
        inventario: {
          unidad_id: unidadId,
          kilometraje: km,
          nivel_combustible: form.nivel_combustible,
          tiene_gato_hidraulico: form.tiene_gato_hidraulico,
          tiene_extintor: form.tiene_extintor,
          tiene_llanta_refaccion: form.tiene_llanta_refaccion,
          observaciones_mecanicas: form.observaciones_mecanicas.trim() || null,
          observaciones_carroceria: form.observaciones_carroceria.trim() || null,
          capturado_por: nombreUsuario(usuario),
        },
        danos: danos.map((d) => ({ ...d, descripcion: d.descripcion?.trim() || null })),
      });
      historial.setDatos((prev) => [{ ...resultado.inventario, danos_diagrama: resultado.danos }, ...(prev ?? [])]);
      aviso.exito(`Inventario de ${ecoDe(unidadId)} guardado con ${resultado.danos.length} daño(s).`);
      setForm(formularioVacio);
      setDanos([]);
      setSeleccionado(null);
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const colorCombustible = form.nivel_combustible < 25 ? 'accent-red-500' : form.nivel_combustible < 50 ? 'accent-amber-500' : 'accent-emerald-500';

  return (
    <Pagina>
      <Encabezado
        icono={ClipboardList}
        seccion="Recepción"
        titulo="Inventario de ingreso"
        descripcion="Checklist de la unidad al llegar y diagrama de daños visibles. Toca el dibujo para marcar cada daño."
      />

      <AvisoConfiguracion />
      {unidades.error && <ErrorCarga mensaje={unidades.error} reintentar={unidades.recargar} />}

      <form onSubmit={guardar} className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Checklist */}
        <div className="space-y-6">
          <Tarjeta titulo="Datos de ingreso" icono={Gauge}>
            <div className="space-y-4">
              <Campo etiqueta="Unidad *">
                <SelectorUnidad unidades={unidades.datos ?? []} valor={unidadId} cambiar={seleccionarUnidad} />
              </Campo>
              <Campo etiqueta="Kilometraje *">
                <div className="relative">
                  <input inputMode="numeric" value={form.kilometraje} onChange={(e) => setForm({ ...form, kilometraje: e.target.value })} placeholder="810240" className={`${claseInput} pr-12 font-mono`} />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">km</span>
                </div>
              </Campo>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-600"><Fuel className="h-3.5 w-3.5" /> Combustible</span>
                  <span className="font-mono text-sm font-bold tabular-nums">{form.nivel_combustible}%</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={form.nivel_combustible} onChange={(e) => setForm({ ...form, nivel_combustible: Number(e.target.value) })} className={`w-full ${colorCombustible}`} />
                <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                  <span>E</span><span>¼</span><span>½</span><span>¾</span><span>F</span>
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Accesorios</span>
                <div className="space-y-2">
                  {ACCESORIOS.map(([campo, etiqueta]) => (
                    <button
                      key={campo}
                      type="button"
                      onClick={() => setForm({ ...form, [campo]: !form[campo] })}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium ring-1 transition ${form[campo] ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-white text-slate-600 ring-slate-200'}`}
                    >
                      {etiqueta}
                      <span className={`relative h-5 w-9 rounded-full transition ${form[campo] ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${form[campo] ? 'left-[18px]' : 'left-0.5'}`} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Observaciones">
            <div className="space-y-4">
              <Campo etiqueta="Mecánicas">
                <textarea rows={3} value={form.observaciones_mecanicas} onChange={(e) => setForm({ ...form, observaciones_mecanicas: e.target.value })} placeholder="Fugas, testigos encendidos, ruidos…" className={claseInput} />
              </Campo>
              <Campo etiqueta="Carrocería">
                <textarea rows={3} value={form.observaciones_carroceria} onChange={(e) => setForm({ ...form, observaciones_carroceria: e.target.value })} placeholder="Faltantes, cristales, pintura…" className={claseInput} />
              </Campo>
            </div>
          </Tarjeta>
        </div>

        {/* Diagrama */}
        <div className="space-y-6">
          <Tarjeta titulo={`Diagrama de daños (${danos.length})`} icono={MousePointerClick}>
            <div className="space-y-4">
              <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                {VISTAS_DIAGRAMA.map((v) => {
                  const n = danos.filter((d) => d.vista === v.valor).length;
                  return (
                    <button
                      key={v.valor}
                      type="button"
                      onClick={() => { setVista(v.valor); setSeleccionado(null); }}
                      className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${vista === v.valor ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {v.etiqueta}
                      {n > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{n}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Marcar como:</span>
                {TIPOS_DANO.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => setTipo(t.valor)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${tipo === t.valor ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200'}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.etiqueta}
                  </button>
                ))}
              </div>

              <DiagramaCamion
                vista={vista}
                puntos={indicesVista.map((i) => danos[i])}
                alMarcar={agregarDano}
                seleccionado={seleccionado === null ? null : indicesVista.indexOf(seleccionado)}
                alSeleccionar={(iLocal) => setSeleccionado(indicesVista[iLocal])}
              />

              {danos.length === 0 ? (
                <p className="text-center text-sm text-slate-500">Sin daños marcados. Si la unidad llega sin daños visibles, puedes guardar así.</p>
              ) : (
                <ul className="space-y-2">
                  {danos.map((d, i) => {
                    const info = infoTipoDano(d.tipo_dano);
                    return (
                      <li key={i} onClick={() => { setVista(d.vista); setSeleccionado(i); }} className={`flex flex-col gap-2 rounded-xl p-2.5 ring-1 transition sm:flex-row sm:items-center ${seleccionado === i ? 'bg-amber-50 ring-amber-300' : 'bg-slate-50 ring-slate-200/70'}`}>
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: info.color }}>{i + 1}</span>
                          <select value={d.tipo_dano} onChange={(e) => editarDano(i, { tipo_dano: e.target.value as TipoDano })} className="rounded-lg border-0 bg-white py-1 pl-2 pr-7 text-xs font-semibold ring-1 ring-slate-200">
                            {TIPOS_DANO.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                          </select>
                          <span className="whitespace-nowrap text-xs text-slate-400">{VISTAS_DIAGRAMA.find((v) => v.valor === d.vista)?.etiqueta}</span>
                        </div>
                        <input value={d.descripcion ?? ''} onChange={(e) => editarDano(i, { descripcion: e.target.value })} placeholder="Descripción (opcional)" className="flex-1 rounded-lg border-0 bg-white px-2.5 py-1.5 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); quitarDano(i); }} className="self-end rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:self-auto" aria-label="Quitar daño">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Tarjeta>

          <button type="submit" disabled={guardando || !unidadId} className={`${claseBotonAcento} w-full py-3.5 text-base`}>
            {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {guardando ? 'Guardando…' : 'Guardar inventario'}
          </button>
        </div>
      </form>

      <Tarjeta titulo="Inventarios recientes" icono={History} sinPadding>
        {historial.cargando ? (
          <Cargando />
        ) : historial.error ? (
          <div className="p-5"><ErrorCarga mensaje={historial.error} reintentar={historial.recargar} /></div>
        ) : !historial.datos?.length ? (
          <div className="p-5"><Vacio icono={ClipboardList} titulo="Aún no hay inventarios capturados" /></div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historial.datos.slice(0, 10).map((inv) => (
              <li key={inv.id}>
                <Link href={`/unidades/${inv.unidad_id}`} className="flex flex-col gap-2 px-5 py-3.5 transition hover:bg-slate-50 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-bold text-slate-900">{ecoDe(inv.unidad_id)}</p>
                    <p className="text-xs text-slate-500">
                      {inv.kilometraje.toLocaleString('es-MX')} km · {inv.nivel_combustible}% combustible · {inv.capturado_por} · {formatearFecha(inv.created_at, true)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {inv.danos_diagrama.length === 0 ? (
                      <Insignia clase="bg-emerald-50 text-emerald-700 ring-emerald-200">Sin daños</Insignia>
                    ) : (
                      TIPOS_DANO.map((t) => {
                        const n = inv.danos_diagrama.filter((d) => d.tipo_dano === t.valor).length;
                        return n ? <Insignia key={t.valor} clase={t.clase}>{t.etiqueta} ×{n}</Insignia> : null;
                      })
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Aviso aviso={aviso.aviso} cerrar={aviso.cerrar} />
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
