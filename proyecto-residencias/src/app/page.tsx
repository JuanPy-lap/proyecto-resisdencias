import Link from 'next/link';
import { ArrowRight, Camera, ClipboardList, MapPinned, QrCode } from 'lucide-react';
import type { Tractocamion } from '@/types/operacion';

const unidades: Tractocamion[] = [
  {
    id: 'UT-01',
    unidad: 'ECO-402',
    economico: 'ECO-402',
    planta: 'Mecánica',
    etapa: 'Proceso',
    estado: 'Activo',
    ultimaActualizacion: 'Hace 22 min',
    responsable: 'R. Velazquez',
  },
  {
    id: 'UT-02',
    unidad: 'ECO-821',
    economico: 'ECO-821',
    planta: 'Laminado',
    etapa: 'Ingreso',
    estado: 'Pendiente',
    ultimaActualizacion: 'Hace 1 h',
    responsable: 'A. García',
  },
  {
    id: 'UT-03',
    unidad: 'ECO-118',
    economico: 'ECO-118',
    planta: 'Pintura',
    etapa: 'Terminado',
    estado: 'En taller',
    ultimaActualizacion: 'Hace 3 h',
    responsable: 'J. Torres',
  },
];

const modulos = [
  {
    href: '/camara',
    title: 'Captura fotográfica',
    description: 'Ingreso, proceso y terminado con compresión optimizada.',
    icon: Camera,
    accent: 'text-blue-600 bg-blue-50',
  },
  {
    href: '/inventario',
    title: 'Inventario de ingreso',
    description: 'Checklist digital y daños por unidad.',
    icon: ClipboardList,
    accent: 'text-amber-600 bg-amber-50',
  },
  {
    href: '/qr-supervision',
    title: 'QR y gato digital',
    description: 'Retiros pendientes, alertas y seguimiento documental.',
    icon: QrCode,
    accent: 'text-violet-600 bg-violet-50',
  },
  {
    href: '/mapa-taller',
    title: 'Mapa de talleres',
    description: 'Plano 2D con racks, ubicaciones y tareas pendientes.',
    icon: MapPinned,
    accent: 'text-emerald-600 bg-emerald-50',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">Residencias profesionales</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Sistema integral de gestión documental y fotográfica</h1>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-200">
            Expedientes activos: <span className="text-xl font-bold text-white">24</span>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modulos.map(({ href, title, description, icon: Icon, accent }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`inline-flex rounded-xl p-3 ${accent}`}>
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              Entrar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Expedientes activos</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            En curso
          </span>
        </div>

        <div className="space-y-3">
          {unidades.map((unidad) => (
            <div key={unidad.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-blue-700">{unidad.unidad}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                    {unidad.etapa}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {unidad.planta} • Responsable: {unidad.responsable}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">{unidad.estado}</span>
                <span>Actualizado {unidad.ultimaActualizacion}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
