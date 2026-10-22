'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CalendarClock,
  ClipboardList,
  ImageIcon,
  Plus,
  QrCode,
  Truck,
  Wrench,
} from 'lucide-react';
import { getAlertasQR, getFotografiasRecientes, getUnidades } from '@/services/api';
import { useDatos, useUsuario } from '@/lib/hooks';
import { ESTADOS_SALIDA, ESTADOS_UNIDAD, claseEstadoUnidad, diasDesde, formatearFecha } from '@/lib/constantes';
import {
  AvisoConfiguracion,
  Cargando,
  ErrorCarga,
  Estadistica,
  Insignia,
  Pagina,
  Tarjeta,
  Vacio,
  claseBotonAcento,
} from '@/components/ui';

const accesos = [
  { href: '/camara', titulo: 'Captura fotográfica', texto: 'Ingreso, proceso y terminado', icon: Camera },
  { href: '/inventario', titulo: 'Inventario de ingreso', texto: 'Checklist y diagrama de daños', icon: ClipboardList },
  { href: '/qr-supervision', titulo: 'Etiquetas QR', texto: 'Colocación y retiro', icon: QrCode },
  { href: '/mapa-taller', titulo: 'Mapa del taller', texto: 'Ubicación por área y rack', icon: Wrench },
];

function saludo() {
  const hora = new Date().getHours();
  return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function HomePage() {
  const usuario = useUsuario();
  const { datos, error, cargando, recargar } = useDatos(() =>
    Promise.all([getUnidades(), getAlertasQR(), getFotografiasRecientes(8)])
  );

  const [unidades, alertasQR, fotos] = datos ?? [[], [], []];
  const activas = unidades.filter((u) => u.estado_unidad !== 'Entregada');
  const vencidas = activas.filter(
    (u) => u.fecha_compromiso && u.estado_unidad !== 'Liberada' && diasDesde(u.fecha_compromiso) > 0
  );
  // QR que siguen colocados en unidades que ya van de salida: riesgo de entregar con etiqueta.
  const qrCriticos = alertasQR.filter(
    (q) => q.estado === 'Colocada' && q.unidades && ESTADOS_SALIDA.includes(q.unidades.estado_unidad)
  );
  const proximas = [...activas]
    .sort((a, b) => (a.fecha_compromiso ?? '9999').localeCompare(b.fecha_compromiso ?? '9999'))
    .slice(0, 6);

  return (
    <Pagina>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-400">
              {saludo()}
              {usuario?.email ? `, ${usuario.email.split('@')[0]}` : ''}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Panel de control del taller</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/unidades?nueva=1" className={claseBotonAcento}>
              <Plus className="h-4 w-4" /> Registrar unidad
            </Link>
            <Link
              href="/camara"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
            >
              <Camera className="h-4 w-4" /> Tomar fotos
            </Link>
          </div>
        </div>
      </section>

      <AvisoConfiguracion />
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Estadistica etiqueta="Unidades en taller" valor={cargando ? '–' : activas.length} detalle={`${unidades.length} registradas en total`} icono={Truck} tono="sky" />
        <Estadistica
          etiqueta="En reparación"
          valor={cargando ? '–' : activas.filter((u) => ['En Diagnóstico', 'En Proceso'].includes(u.estado_unidad)).length}
          detalle="Diagnóstico + proceso"
          icono={Wrench}
          tono="amber"
        />
        <Estadistica etiqueta="Compromisos vencidos" valor={cargando ? '–' : vencidas.length} detalle="Fecha compromiso superada" icono={CalendarClock} tono={vencidas.length ? 'red' : 'emerald'} />
        <Estadistica etiqueta="QR por retirar" valor={cargando ? '–' : alertasQR.filter((q) => q.estado === 'Colocada').length} detalle={qrCriticos.length ? `${qrCriticos.length} en unidades de salida` : 'Sin riesgos de salida'} icono={QrCode} tono={qrCriticos.length ? 'red' : 'slate'} />
      </section>

      {/* Flujo por estado */}
      <Tarjeta titulo="Flujo de unidades" icono={Truck} acciones={<Link href="/unidades" className="text-sm font-semibold text-amber-600 hover:underline">Ver todas</Link>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ESTADOS_UNIDAD.map((estado, i) => {
            const total = unidades.filter((u) => u.estado_unidad === estado.valor).length;
            return (
              <Link
                key={estado.valor}
                href={`/unidades?estado=${encodeURIComponent(estado.valor)}`}
                className="group relative rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70 transition hover:bg-white hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${estado.punto}`} />
                  {i + 1}. {estado.valor}
                </div>
                <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{cargando ? '–' : total}</p>
              </Link>
            );
          })}
        </div>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Próximas entregas */}
        <Tarjeta titulo="Próximas entregas" icono={CalendarClock} sinPadding>
          {cargando ? (
            <Cargando />
          ) : proximas.length === 0 ? (
            <div className="p-5">
              <Vacio icono={Truck} titulo="No hay unidades en el taller" texto="Registra la primera unidad para comenzar su expediente." accion={<Link href="/unidades?nueva=1" className={claseBotonAcento}><Plus className="h-4 w-4" />Registrar unidad</Link>} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {proximas.map((u) => {
                const dias = u.fecha_compromiso ? -diasDesde(u.fecha_compromiso) : null;
                return (
                  <li key={u.id}>
                    <Link href={`/unidades/${u.id}`} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-amber-400">
                        <Truck className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{u.unidad_eco}</span>
                          <Insignia clase={claseEstadoUnidad(u.estado_unidad)}>{u.estado_unidad}</Insignia>
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {[u.modelo, u.cliente_aseguradora, u.responsable_asignado].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        {dias === null ? (
                          <span className="text-slate-400">Sin compromiso</span>
                        ) : (
                          <>
                            <p className={`font-bold ${dias < 0 ? 'text-red-600' : dias <= 2 ? 'text-amber-600' : 'text-slate-700'}`}>
                              {dias < 0 ? `Vencida hace ${-dias} d` : dias === 0 ? 'Hoy' : `En ${dias} d`}
                            </p>
                            <p className="text-slate-400">{formatearFecha(u.fecha_compromiso)}</p>
                          </>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        {/* Alertas QR */}
        <Tarjeta titulo="Alertas de salida" icono={AlertTriangle} acciones={<Link href="/qr-supervision" className="text-sm font-semibold text-amber-600 hover:underline">Gestionar</Link>}>
          {cargando ? (
            <Cargando />
          ) : qrCriticos.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
              <QrCode className="h-5 w-5 shrink-0" />
              Ninguna unidad de salida tiene etiquetas QR pendientes de retirar.
            </div>
          ) : (
            <ul className="space-y-2">
              {qrCriticos.map((q) => (
                <li key={q.id} className="rounded-xl bg-red-50 p-3 text-sm ring-1 ring-red-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-red-800">{q.unidades?.unidad_eco}</span>
                    <span className="font-mono text-xs text-red-600">{q.codigo_qr}</span>
                  </div>
                  <p className="mt-1 text-xs text-red-700">
                    Unidad en «{q.unidades?.estado_unidad}» con QR colocado en {q.taller}
                    {q.ubicacion_rack ? ` / ${q.ubicacion_rack}` : ''}.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      {/* Fotos recientes */}
      <Tarjeta titulo="Últimas fotografías" icono={ImageIcon} acciones={<Link href="/camara" className="text-sm font-semibold text-amber-600 hover:underline">Ir a cámara</Link>}>
        {cargando ? (
          <Cargando />
        ) : fotos.length === 0 ? (
          <Vacio icono={Camera} titulo="Aún no hay fotografías" texto="Las capturas del módulo de cámara aparecerán aquí." />
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

      {/* Accesos rápidos */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {accesos.map(({ href, titulo, texto, icon: Icon }) => (
          <Link key={href} href={href} className="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="rounded-xl bg-amber-50 p-3 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-slate-950">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">{titulo}</p>
              <p className="truncate text-xs text-slate-500">{texto}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600" />
          </Link>
        ))}
      </section>
    </Pagina>
  );
}
