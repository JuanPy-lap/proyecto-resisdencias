'use client';

import { ClipboardList, FileText, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { Inventario } from '@/types/operacion';

const inventario: Inventario[] = [
  {
    id: 'INV-01',
    unidadEco: 'ECO-402',
    kilometraje: '810,240 km',
    condicion: 'Ingreso con daños visibles',
    fotos: 14,
    observaciones: ['Faro delantero con abolladura', 'Lado izquierdo con rayón medio'],
    danos: ['Cabina', 'Costado izquierdo', 'Parachoques'],
  },
  {
    id: 'INV-02',
    unidadEco: 'ECO-821',
    kilometraje: '734,100 km',
    condicion: 'Sin daños mayores',
    fotos: 9,
    observaciones: ['Documentación completa', 'Frenos revisados'],
    danos: ['Ninguno'],
  },
];

export default function InventarioPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Inventario</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Control digital de ingreso e inspección</h1>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-amber-700">
          <ClipboardList className="h-7 w-7" />
          <span className="text-sm font-semibold">Checklist operativo</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {inventario.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Unidad</p>
                <h2 className="mt-2 font-mono text-2xl font-bold text-slate-900">{item.unidadEco}</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                {item.condicion}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Kilometraje</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{item.kilometraje}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fotografías</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{item.fotos}</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <TriangleAlert className="h-4 w-4 text-amber-600" />
                  Daños detectados
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.danos.map((daño) => (
                    <span key={daño} className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                      {daño}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Observaciones
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {item.observaciones.map((observacion) => (
                    <li key={observacion} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                      <span>{observacion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
