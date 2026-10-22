'use client';

import { useState } from 'react';
import { Loader2, Truck, X } from 'lucide-react';
import { createUnidad } from '@/services/api';
import { mensajeDeError } from '@/lib/hooks';
import type { Unidad, UnidadInsert } from '@/types/supabase';
import { Campo, claseBotonAcento, claseBotonSecundario, claseInput } from '@/components/ui';

const hoy = () => new Date().toISOString().slice(0, 10);

/** Ventana modal para dar de alta una unidad en recepción. */
export default function FormularioUnidad({ cerrar, alCrear }: { cerrar: () => void; alCrear: (u: Unidad) => void }) {
  const [form, setForm] = useState<UnidadInsert>({ unidad_eco: '', fecha_ingreso: hoy() });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiar = (campo: keyof UnidadInsert) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value || null }));

  const guardar = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.unidad_eco?.trim()) return setError('El número económico es obligatorio.');
    setGuardando(true);
    setError(null);
    try {
      alCrear(await createUnidad({ ...form, vin: form.vin?.toUpperCase() ?? null }));
    } catch (err) {
      setError(mensajeDeError(err));
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={cerrar}>
      <form
        onSubmit={guardar}
        onClick={(e) => e.stopPropagation()}
        className="animate-entrada max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <span className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
              <Truck className="h-5 w-5" />
            </span>
            Registrar unidad
          </h2>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Campo etiqueta="No. económico *">
            <input autoFocus required value={form.unidad_eco} onChange={(e) => setForm((f) => ({ ...f, unidad_eco: e.target.value }))} placeholder="ECO-402" className={`${claseInput} font-mono uppercase`} />
          </Campo>
          <Campo etiqueta="VIN / No. de serie">
            <input value={form.vin ?? ''} onChange={cambiar('vin')} maxLength={17} placeholder="17 caracteres" className={`${claseInput} font-mono uppercase`} />
          </Campo>
          <Campo etiqueta="Modelo">
            <input value={form.modelo ?? ''} onChange={cambiar('modelo')} placeholder="Freightliner Cascadia 2020" className={claseInput} />
          </Campo>
          <Campo etiqueta="Cliente / Aseguradora">
            <input value={form.cliente_aseguradora ?? ''} onChange={cambiar('cliente_aseguradora')} placeholder="Nombre del cliente" className={claseInput} />
          </Campo>
          <Campo etiqueta="Tipo de golpe / servicio">
            <input value={form.tipo_golpe ?? ''} onChange={cambiar('tipo_golpe')} placeholder="Colisión frontal, laminado lateral…" className={claseInput} />
          </Campo>
          <Campo etiqueta="Responsable asignado">
            <input value={form.responsable_asignado ?? ''} onChange={cambiar('responsable_asignado')} placeholder="Nombre del técnico" className={claseInput} />
          </Campo>
          <Campo etiqueta="Fecha de ingreso">
            <input type="date" value={form.fecha_ingreso ?? ''} onChange={cambiar('fecha_ingreso')} className={claseInput} />
          </Campo>
          <Campo etiqueta="Fecha compromiso">
            <input type="date" min={form.fecha_ingreso ?? undefined} value={form.fecha_compromiso ?? ''} onChange={cambiar('fecha_compromiso')} className={claseInput} />
          </Campo>
        </div>

        {error && <p className="mx-6 mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</p>}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={cerrar} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={claseBotonAcento}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar unidad
          </button>
        </div>
      </form>
    </div>
  );
}
