'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, QrCode, ShieldAlert } from 'lucide-react';
import type { AlertaQR, PrioridadQR } from '@/types/operacion';

const alertasIniciales: AlertaQR[] = [
  {
    id: 'QR-001',
    unidadEco: 'ECO-402',
    tipoFalla: 'Freno / Neumáticos',
    prioridad: 'Alta',
    descripcion: 'Se detectó desgaste irregular en la llanta delantera derecha.',
    fecha: '2026-09-28 09:15',
    area: 'Mecánica',
    estado: 'Pendiente',
  },
  {
    id: 'QR-002',
    unidadEco: 'ECO-821',
    tipoFalla: 'Pintura / Carrocería',
    prioridad: 'Media',
    descripcion: 'Abolladura superficial en costado izquierdo.',
    fecha: '2026-09-28 07:40',
    area: 'Laminado',
    estado: 'Atendida',
  },
];

export default function QRSupervisionPage() {
  const [codigoLeido, setCodigoLeido] = useState('');
  const [tipoFalla, setTipoFalla] = useState('Frena / Neumáticos');
  const [prioridad, setPrioridad] = useState<PrioridadQR>('Media');
  const [descripcion, setDescripcion] = useState('');
  const [alertas, setAlertas] = useState<AlertaQR[]>(alertasIniciales);
  const [registrado, setRegistrado] = useState(false);

  const registrarAlerta = (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigoLeido || !descripcion) {
      alert('Por favor ingresa el código de unidad y la descripción del hallazgo');
      return;
    }

    const nuevaAlerta: AlertaQR = {
      id: `QR-${Date.now()}`,
      unidadEco: codigoLeido.toUpperCase(),
      tipoFalla,
      prioridad,
      descripcion,
      fecha: new Date().toLocaleString('es-MX'),
      area: 'Supervisión',
      estado: 'Pendiente',
    };

    setAlertas((prev) => [nuevaAlerta, ...prev]);
    setDescripcion('');
    setRegistrado(true);
    window.setTimeout(() => setRegistrado(false), 3000);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
          <QrCode className="h-8 w-8" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Supervisión QR</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Registro y alertas por código QR</h1>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {registrado && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
            <CheckCircle className="h-5 w-5" />
            Alerta registrada correctamente en el expediente de la unidad.
          </div>
        )}

        <form onSubmit={registrarAlerta} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.15em] text-slate-700">
                Unidad / Código Económico QR
              </label>
              <input
                type="text"
                placeholder="Ej. ECO-402 o TRACTO-08"
                value={codigoLeido}
                onChange={(event) => setCodigoLeido(event.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.15em] text-slate-700">
                Área de Hallazgo / Falla
              </label>
              <select
                value={tipoFalla}
                onChange={(event) => setTipoFalla(event.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="Frena / Neumáticos">Frena / Neumáticos</option>
                <option value="Fuga de Aceite / Motor">Fuga de Aceite / Motor</option>
                <option value="Sistema Eléctrico">Sistema Eléctrico</option>
                <option value="Fallo Físico / Carrocería">Fallo Físico / Carrocería</option>
                <option value="Documentación / Check-in">Documentación / Check-in</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-slate-700">
              Nivel de prioridad
            </label>
            <div className="grid gap-2 sm:grid-cols-4">
              {(['Baja', 'Media', 'Alta', 'Crítica'] as const).map((nivel) => (
                <button
                  key={nivel}
                  type="button"
                  onClick={() => setPrioridad(nivel)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    prioridad === nivel
                      ? nivel === 'Crítica'
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {nivel}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.15em] text-slate-700">
              Observaciones / Detalle técnico
            </label>
            <textarea
              rows={3}
              placeholder="Describe el daño o hallazgo encontrado durante la supervisión..."
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white transition hover:bg-slate-800"
          >
            <ShieldAlert className="h-5 w-5 text-yellow-400" />
            Guardar reportación de hallazgo
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Historial de alertas registradas ({alertas.length})
        </h2>

        <div className="space-y-3">
          {alertas.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-blue-700">{item.unidadEco}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                    {item.tipoFalla}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.descripcion}</p>
                <span className="mt-2 block text-xs text-slate-500">{item.fecha} • {item.area}</span>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  item.prioridad === 'Crítica'
                    ? 'bg-red-100 text-red-700'
                    : item.prioridad === 'Alta'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                }`}
              >
                {item.prioridad}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
