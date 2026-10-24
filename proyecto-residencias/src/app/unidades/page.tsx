'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarClock, ChevronRight, Plus, Search, Truck } from 'lucide-react';
import { getUnidades } from '@/services/api';
import { useDatos } from '@/lib/hooks';
import { ESTADOS_UNIDAD, claseEstadoUnidad, diasDesde, formatearFecha } from '@/lib/constantes';
import type { EstadoUnidad } from '@/types/supabase';
import FormularioUnidad from '@/components/FormularioUnidad';
import {
  AvisoConfiguracion,
  Cargando,
  Encabezado,
  ErrorCarga,
  Insignia,
  Pagina,
  Tarjeta,
  Vacio,
  claseBotonAcento,
  claseInput,
} from '@/components/ui';

function ListaUnidades() {
  const router = useRouter();
  const params = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(params.get('nueva') === '1');
  const filtroEstado = (params.get('estado') as EstadoUnidad | null) ?? null;

  const { datos: unidades, error, cargando, recargar } = useDatos(getUnidades);

  const filtrarEstado = (estado: EstadoUnidad | null) =>
    router.replace(estado ? `/unidades?estado=${encodeURIComponent(estado)}` : '/unidades', { scroll: false });

  const texto = busqueda.trim().toLowerCase();
  const visibles = (unidades ?? []).filter(
    (u) =>
      (!filtroEstado || u.estado_unidad === filtroEstado) &&
      (!texto ||
        [u.unidad_eco, u.vin, u.modelo, u.cliente_aseguradora, u.responsable_asignado].some((v) => v?.toLowerCase().includes(texto)))
  );

  return (
    <Pagina>
      <Encabezado
        icono={Truck}
        seccion="Recepción"
        titulo="Unidades"
        descripcion="Alta de tractocamiones y seguimiento de su estado en el taller."
        acciones={
          <button onClick={() => setMostrarForm(true)} className={claseBotonAcento}>
            <Plus className="h-4 w-4" /> Registrar unidad
          </button>
        }
      />

      <AvisoConfiguracion />
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cono, VIN, cliente…" className={`${claseInput} pl-10`} />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          <button
            onClick={() => filtrarEstado(null)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition ${!filtroEstado ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}
          >
            Todas ({unidades?.length ?? 0})
          </button>
          {ESTADOS_UNIDAD.map((e) => (
            <button
              key={e.valor}
              onClick={() => filtrarEstado(e.valor)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition ${filtroEstado === e.valor ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${e.punto}`} />
              {e.valor} ({unidades?.filter((u) => u.estado_unidad === e.valor).length ?? 0})
            </button>
          ))}
        </div>
      </div>

      <Tarjeta sinPadding>
        {cargando ? (
          <Cargando />
        ) : visibles.length === 0 ? (
          <div className="p-5">
            <Vacio
              icono={Truck}
              titulo={unidades?.length ? 'Ninguna unidad coincide' : 'Aún no hay unidades'}
              texto={unidades?.length ? 'Prueba con otro filtro o búsqueda.' : 'Registra la primera unidad que llega al taller.'}
            />
          </div>
        ) : (
          <>
            {/* Tabla en escritorio */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Unidad</th>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold">Ingreso</th>
                    <th className="px-5 py-3 font-semibold">Compromiso</th>
                    <th className="px-5 py-3 font-semibold">Responsable</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibles.map((u) => {
                    const vencida = u.fecha_compromiso && u.estado_unidad !== 'Entrega' && diasDesde(u.fecha_compromiso) > 0;
                    return (
                      <tr key={u.id} onClick={() => router.push(`/unidades/${u.id}`)} className="cursor-pointer transition hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <p className="font-mono font-bold text-slate-900">{u.unidad_eco}</p>
                          <p className="text-xs text-slate-500">{u.modelo ?? '—'}</p>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{u.cliente_aseguradora ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <Insignia clase={claseEstadoUnidad(u.estado_unidad)}>{u.estado_unidad}</Insignia>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{formatearFecha(u.fecha_ingreso)}</td>
                        <td className={`px-5 py-3.5 ${vencida ? 'font-semibold text-red-600' : 'text-slate-600'}`}>
                          <span className="inline-flex items-center gap-1">
                            {vencida && <CalendarClock className="h-4 w-4" />}
                            {formatearFecha(u.fecha_compromiso)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{u.responsable_asignado ?? '—'}</td>
                        <td className="px-5 py-3.5 text-right">
                          <ChevronRight className="inline h-4 w-4 text-slate-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas en celular */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {visibles.map((u) => (
                <li key={u.id}>
                  <Link href={`/unidades/${u.id}`} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{u.unidad_eco}</span>
                        <Insignia clase={claseEstadoUnidad(u.estado_unidad)}>{u.estado_unidad}</Insignia>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {[u.modelo, u.cliente_aseguradora].filter(Boolean).join(' · ') || 'Sin datos'} · Compromiso {formatearFecha(u.fecha_compromiso)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Tarjeta>

      {mostrarForm && (
        <FormularioUnidad
          cerrar={() => setMostrarForm(false)}
          alCrear={(u) => router.push(`/unidades/${u.id}`)}
        />
      )}
    </Pagina>
  );
}

export default function UnidadesPage() {
  return (
    <Suspense>
      <ListaUnidades />
    </Suspense>
  );
}
