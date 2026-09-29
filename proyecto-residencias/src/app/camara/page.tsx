'use client';

import { Camera, CheckCircle2, ImageUp, ShieldCheck } from 'lucide-react';
import type { Fotografia } from '@/types/operacion';

const fotos: Fotografia[] = [
  {
    id: 'F-1021',
    unidadEco: 'ECO-402',
    etapa: 'Ingreso',
    nombre: 'ingreso_frontal_01.jpg',
    fecha: '2026-09-28 08:20',
    pesoKb: 640,
    calidad: 'Alta',
  },
  {
    id: 'F-1022',
    unidadEco: 'ECO-402',
    etapa: 'Proceso',
    nombre: 'laminado_lado_izquierdo.jpg',
    fecha: '2026-09-28 11:35',
    pesoKb: 720,
    calidad: 'Alta',
  },
  {
    id: 'F-1023',
    unidadEco: 'ECO-821',
    etapa: 'Terminado',
    nombre: 'terminado_pintura_final.jpg',
    fecha: '2026-09-28 15:10',
    pesoKb: 580,
    calidad: 'Media',
  },
];

export default function CamaraPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Captura fotográfica</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Módulo de fotos por ingreso, proceso y terminado</h1>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-3 text-blue-700">
          <Camera className="h-7 w-7" />
          <span className="text-sm font-semibold">3 unidades en revisión</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Ingreso</span>
            <ImageUp className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">12</p>
          <p className="mt-2 text-sm text-slate-500">Fotografías registradas hoy</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Proceso</span>
            <ShieldCheck className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">18</p>
          <p className="mt-2 text-sm text-slate-500">Secciones revisadas</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Terminado</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">9</p>
          <p className="mt-2 text-sm text-slate-500">Entregas listas para cierre</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Últimas capturas agrupadas por unidad</h2>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            Nueva captura
          </button>
        </div>

        <div className="space-y-3">
          {fotos.map((foto) => (
            <div key={foto.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-700">{foto.unidadEco}</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                      {foto.etapa}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{foto.nombre}</p>
                </div>
              </div>

              <div className="grid gap-1 text-xs text-slate-500 md:text-right">
                <span>{foto.fecha}</span>
                <span>{foto.pesoKb} KB</span>
                <span>{foto.calidad}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
