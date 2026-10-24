'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, ArrowRight, CalendarClock, Camera, Hourglass, ImageIcon, ListChecks, Plus, QrCode, Truck, Wrench } from 'lucide-react';
import { getAlertasQR, getFotografiasRecientes, getResumenUnidades, getUnidades } from '@/services/api';
import { useDatos, useUsuario } from '@/lib/hooks';
import { ESTADOS_SALIDA, ESTADOS_UNIDAD, claseEstadoUnidad, diasDesde, formatearFecha, indiceEstado, siguienteEstado, situacionRetiro } from '@/lib/constantes';
import { RESUMEN_VACIO, pendientesParaAvanzar, tareasDeFase, type ResumenUnidad } from '@/lib/fases';
import type { Unidad } from '@/types/supabase';
import { AvisoConfiguracion, Cargando, ErrorCarga, Estadistica, Insignia, Pagina, Tarjeta, Vacio, claseBotonAcento } from '@/components/ui';

function saludo() {
  const hora = new Date().getHours();
  return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
}

/** Siguiente paso de una unidad: la primera tarea pendiente de su fase o avanzar de fase. */
function siguientePaso(u: Unidad, resumen: Map<string, ResumenUnidad>) {
  const tareas = tareasDeFase(u, resumen.get(u.id) ?? RESUMEN_VACIO);
  const pendiente = tareas.find((t) => !t.hecha && t.obligatoria) ?? tareas.find((t) => !t.hecha);
  if (pendiente) return { texto: pendiente.titulo, accion: pendiente.accion, href: pendiente.href, espera: false };
  if (u.estado_unidad === 'Espera de Liberación') {
    return { texto: 'Esperando liberación de la aseguradora', accion: 'Ver unidad', href: `/unidades/${u.id}`, espera: true };
  }
  return {
    texto: pendientesParaAvanzar(tareas).length ? 'Completar tareas' : `Lista para pasar a ${siguienteEstado(u.estado_unidad)}`,
    accion: 'Abrir',
    href: `/unidades/${u.id}`,
    espera: false,
  };
}

export default function HomePage() {
  const usuario = useUsuario();
  const { datos, error, cargando, recargar } = useDatos(() =>
    Promise.all([getUnidades(), getAlertasQR(), getFotografiasRecientes(8), getResumenUnidades()])
  );

  const [unidades, alertasQR, fotos, resumen] = datos ?? [[], [], [], new Map<string, ResumenUnidad>()];
  const activas = unidades.filter((u) => u.estado_unidad !== 'Entrega');
  const vencidas = activas.filter((u) => u.fecha_compromiso && diasDesde(u.fecha_compromiso) > 0);
  const qrUrgentes = alertasQR.filter((q) => {
    const tipo = situacionRetiro(q)?.tipo;
    return tipo === 'vencido' || tipo === 'hoy' || (q.estado === 'Colocada' && !!q.unidades && ESTADOS_SALIDA.includes(q.unidades.estado_unidad));
  });
  // Primero las que van más adelantadas en el proceso y luego por fecha compromiso.
  const pendientes = [...activas].sort(
    (a, b) => indiceEstado(b.estado_unidad) - indiceEstado(a.estado_unidad) || (a.fecha_compromiso ?? '9').localeCompare(b.fecha_compromiso ?? '9')
  );

  return (
    <Pagina>
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-400">
              {saludo()}
              {usuario?.email ? `, ${usuario.email.split('@')[0]}` : ''}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Panel del taller</h1>
            <p className="mt-1 text-sm text-slate-400">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <Link href="/unidades?nueva=1" className={claseBotonAcento}>
            <Plus className="h-4 w-4" /> Registrar unidad
          </Link>
        </div>
      </section>

      <AvisoConfiguracion />
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Estadistica etiqueta="En el taller" valor={cargando ? '–' : activas.length} detalle={`${unidades.length - activas.length} entregadas`} icono={Truck} tono="sky" />
        <Estadistica etiqueta="En proceso" valor={cargando ? '–' : activas.filter((u) => u.estado_unidad === 'Proceso').length} detalle="Reparación en curso" icono={Wrench} tono="amber" />
        <Estadistica etiqueta="QR por retirar" valor={cargando ? '–' : qrUrgentes.length} detalle="Hoy o vencidos" icono={QrCode} tono={qrUrgentes.length ? 'red' : 'emerald'} />
        <Estadistica etiqueta="Compromiso vencido" valor={cargando ? '–' : vencidas.length} detalle="Pasó su fecha compromiso" icono={CalendarClock} tono={vencidas.length ? 'red' : 'emerald'} />
      </section>

      {/* Unidades por fase */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {ESTADOS_UNIDAD.map((estado, i) => (
          <Link key={estado.valor} href={`/unidades?estado=${encodeURIComponent(estado.valor)}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className={`h-2 w-2 rounded-full ${estado.punto}`} />
              {i + 1}. {estado.valor}
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{cargando ? '–' : unidades.filter((u) => u.estado_unidad === estado.valor).length}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Tarjeta titulo="¿Qué sigue?" icono={ListChecks} sinPadding>
          {cargando ? (
            <Cargando />
          ) : pendientes.length === 0 ? (
            <div className="p-5">
              <Vacio icono={Truck} titulo="No hay unidades en el taller" accion={<Link href="/unidades?nueva=1" className={claseBotonAcento}><Plus className="h-4 w-4" />Registrar unidad</Link>} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendientes.map((u) => {
                const paso = siguientePaso(u, resumen);
                return (
                  <li key={u.id} className="flex items-center gap-3 px-5 py-3.5">
                    <Link href={`/unidades/${u.id}`} className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{u.unidad_eco}</span>
                        <Insignia clase={claseEstadoUnidad(u.estado_unidad)}>{u.estado_unidad}</Insignia>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                        {paso.espera && <Hourglass className="h-3 w-3" />}
                        {paso.texto}
                        {u.fecha_compromiso && ` · compromiso ${formatearFecha(u.fecha_compromiso)}`}
                      </p>
                    </Link>
                    <Link href={paso.href} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                      {paso.accion} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="QR por retirar" icono={AlertTriangle} acciones={<Link href="/qr-supervision" className="text-sm font-semibold text-amber-600 hover:underline">Ver QR</Link>}>
          {cargando ? (
            <Cargando />
          ) : qrUrgentes.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
              <QrCode className="h-5 w-5 shrink-0" /> No hay QR por retirar hoy.
            </div>
          ) : (
            <ul className="space-y-2">
              {qrUrgentes.map((q) => (
                <li key={q.id} className="rounded-xl bg-red-50 p-3 text-sm ring-1 ring-red-200">
                  <p className="font-mono font-bold text-red-800">{q.codigo_qr} · {q.taller}{q.ubicacion_rack ? ` / ${q.ubicacion_rack}` : ''}</p>
                  <p className="text-xs text-red-700">{situacionRetiro(q)?.texto ?? `Unidad en ${q.unidades?.estado_unidad}`}</p>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Últimas fotos" icono={ImageIcon} acciones={<Link href="/fotos" className="text-sm font-semibold text-amber-600 hover:underline">Ir a fotos</Link>}>
        {cargando ? (
          <Cargando />
        ) : fotos.length === 0 ? (
          <Vacio icono={Camera} titulo="Aún no hay fotos" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {fotos.map((f) => (
              <Link key={f.id} href={`/unidades/${f.unidad_id}`} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                <Image src={f.url_publica} alt={`${f.unidades?.unidad_eco ?? ''} ${f.etapa}`} fill sizes="(min-width:1024px) 12vw, 45vw" className="object-cover transition duration-300 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] font-semibold text-white">
                  <span className="font-mono">{f.unidades?.unidad_eco}</span> · {f.etapa}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Tarjeta>
    </Pagina>
  );
}
