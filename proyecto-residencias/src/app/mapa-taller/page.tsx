'use client';

import { Factory, MapPinned, PackageCheck, Wrench } from 'lucide-react';

const racks = [
  { id: 'Rack A1', area: 'Mecánica', x: '8%', y: '12%', status: 'Activo' },
  { id: 'Rack B2', area: 'Laminado', x: '38%', y: '38%', status: 'Pendiente' },
  { id: 'Rack C3', area: 'Pintura', x: '66%', y: '22%', status: 'Activo' },
  { id: 'Rack D4', area: 'Almacén', x: '58%', y: '68%', status: 'Revision' },
];

export default function MapaTallerPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Mapa de taller</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Plano 2D de áreas y ubicaciones</h1>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-violet-50 p-3 text-violet-700">
          <MapPinned className="h-7 w-7" />
          <span className="text-sm font-semibold">4 racks activos</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="relative min-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.12),_rgba(255,255,255,0)_60%)]" />

          <div className="relative h-full w-full rounded-2xl border border-slate-200 bg-slate-50">
            <div className="absolute left-6 top-6 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              Recepción
            </div>
            <div className="absolute left-1/2 top-1/3 h-28 w-40 -translate-x-1/2 rounded-2xl border-2 border-slate-300 bg-slate-200/80 p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
                <Factory className="h-4 w-4" />
                Taller principal
              </div>
            </div>

            <div className="absolute left-6 top-1/2 h-28 w-32 rounded-2xl border-2 border-amber-300 bg-amber-100/80 p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700">
                <Wrench className="h-4 w-4" />
                Mecánica
              </div>
            </div>

            <div className="absolute right-6 top-1/3 h-32 w-36 rounded-2xl border-2 border-emerald-300 bg-emerald-100/80 p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                <PackageCheck className="h-4 w-4" />
                Pintura
              </div>
            </div>

            <div className="absolute bottom-6 left-1/3 h-28 w-36 rounded-2xl border-2 border-violet-300 bg-violet-100/80 p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-violet-700">
                <MapPinned className="h-4 w-4" />
                Laminado
              </div>
            </div>

            {racks.map((rack) => (
              <div
                key={rack.id}
                className="absolute flex h-14 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-300 bg-white text-center text-[10px] font-bold shadow-sm"
                style={{ left: rack.x, top: rack.y }}
              >
                <div>
                  <div>{rack.id}</div>
                  <div className="text-[8px] text-slate-500">{rack.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Estado operativo</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span>Alertas activas</span>
                <strong className="text-red-600">04</strong>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span>QR pendientes</span>
                <strong className="text-amber-600">07</strong>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span>Unidades en rack</span>
                <strong className="text-emerald-600">12</strong>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Retiros programados</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="font-semibold text-slate-800">ECO-402</div>
                <div>Retiro QR del rack B2</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="font-semibold text-slate-800">ECO-821</div>
                <div>Asignación final en Pintura</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
