'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, Eraser, FileSpreadsheet, Loader2 } from 'lucide-react';
import { guardarInventarioCompleto } from '@/services/api';
import { mensajeDeError, nombreUsuario, useAviso, useUsuario } from '@/lib/hooks';
import { NIVELES_COMBUSTIBLE, formatearFecha, hoyISO } from '@/lib/constantes';
import { CAMPOS_ENCABEZADO, COLUMNAS_HOJA, ESTADOS_PARTE, ITEMS_HOJA, type GrupoHoja } from '@/lib/hojaInventario';
import { descargarExcelInventario } from '@/lib/excelInventario';
import type { DatosHoja, EstadoParte, ParteInventario, Unidad } from '@/types/supabase';
import HojaDanos, { Medidor, type Marca } from '@/components/DiagramaCamion';
import { Aviso, claseBotonAcento } from '@/components/ui';

// Formulario con el formato de la hoja "INVENTARIO FÍSICO ESTADO UNIDAD" (Depto. Operativo RSAD).
// Al guardar descarga el Excel con el mismo formato y regresa al expediente de la unidad.

const claseCampo =
  'w-full border-0 bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-300 focus:bg-amber-50 focus:outline-none';
const claseAmarillo = 'bg-[#F6C143] px-2 py-1 text-center text-[11px] font-bold uppercase text-slate-900';

export default function HojaInventario({ unidad }: { unidad: Unidad }) {
  const router = useRouter();
  const usuario = useUsuario();
  const aviso = useAviso();

  const [datos, setDatos] = useState<DatosHoja>({
    cliente: unidad.cliente_aseguradora ?? '',
    modelo: unidad.modelo ?? '',
    numero_serie: unidad.vin ?? '',
  });
  const [kilometraje, setKilometraje] = useState('');
  const [checklist, setChecklist] = useState<Record<string, ParteInventario>>({});
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [combustibleLH, setCombustibleLH] = useState(50);
  const [combustibleRH, setCombustibleRH] = useState(50);
  const [observaciones, setObservaciones] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [guardando, setGuardando] = useState(false);

  const campo = (clave: keyof DatosHoja) => ({
    value: datos[clave] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDatos((d) => ({ ...d, [clave]: e.target.value })),
  });

  const parte = (clave: string, cambios: ParteInventario) => setChecklist((c) => ({ ...c, [clave]: { ...c[clave], ...cambios } }));

  const marcarEstado = (clave: string, estado: EstadoParte) => {
    const actual = checklist[clave];
    // Tocar el mismo estado lo desmarca; al marcar por primera vez la cantidad queda en 1.
    if (actual?.estado === estado) parte(clave, { estado: null });
    else parte(clave, { estado, cant: actual?.cant ?? 1 });
  };

  const pendientes = ITEMS_HOJA.filter((i) => !i.sino && !checklist[i.clave]?.estado);
  const marcarRestoBueno = () =>
    setChecklist((c) => {
      const nuevo = { ...c };
      pendientes.forEach((i) => (nuevo[i.clave] = { cant: c[i.clave]?.cant ?? 1, estado: 'B' }));
      return nuevo;
    });

  const guardar = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const km = Number(kilometraje.replace(/[^\d]/g, ''));
    if (!km) return aviso.error('Captura el kilometraje actual.');

    setGuardando(true);
    try {
      const datosLimpios = Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, v?.trim()]).filter(([, v]) => v)) as DatosHoja;
      const { inventario } = await guardarInventarioCompleto({
        inventario: {
          unidad_id: unidad.id,
          kilometraje: km,
          nivel_combustible: combustibleLH,
          nivel_combustible_rh: combustibleRH,
          datos_hoja: datosLimpios,
          checklist,
          tiene_gato_hidraulico: !!checklist['herramientas.gato']?.estado,
          tiene_extintor: !!checklist['senales.extintor']?.estado,
          tiene_llanta_refaccion: false,
          observaciones: observaciones.trim() || null,
          supervisor: supervisor.trim() || null,
          capturado_por: nombreUsuario(usuario),
        },
        danos: marcas,
      });
      try {
        await descargarExcelInventario(unidad, inventario, marcas);
      } catch (err) {
        // El inventario ya quedó guardado; el Excel se puede volver a descargar desde la unidad.
        console.error('[inventario] No se generó el Excel:', err);
      }
      router.push(`/unidades/${unidad.id}?hecho=inventario`);
    } catch (err) {
      aviso.error(mensajeDeError(err));
      setGuardando(false);
    }
  };

  const bloque = (grupos: GrupoHoja[], indice: number) => (
    <div key={indice} className="border-slate-300 lg:border-r lg:last:border-r-0">
      <div className="grid grid-cols-[1fr_3rem_6.5rem] bg-slate-200 text-[10px] font-bold uppercase text-slate-700">
        <span className="px-2 py-1">Partes y accesorios</span>
        <span className="py-1 text-center">Cant</span>
        <span className="grid grid-cols-3 py-1 text-center"><span>B</span><span>R</span><span>M</span></span>
      </div>
      {grupos.map((g, gi) => (
        <div key={gi}>
          {g.titulo && (
            <div className="flex items-center justify-between bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
              {g.titulo}
              {g.sino && <span className="grid w-[6.5rem] grid-cols-2 text-center"><span>SÍ</span><span>NO</span></span>}
            </div>
          )}
          {g.items.map((item) => {
            const p = checklist[item.clave] ?? {};
            return (
              <div key={item.clave} className="grid grid-cols-[1fr_auto] items-center gap-1 border-b border-slate-100 px-2 py-0.5">
                <span className="truncate text-xs text-slate-700" title={item.etiqueta}>{item.etiqueta}</span>
                {g.sino ? (
                  <div className="grid w-[6.5rem] grid-cols-2 gap-1">
                    {[true, false].map((v) => (
                      <button key={String(v)} type="button" onClick={() => parte(item.clave, { si: p.si === v ? null : v })} className={`rounded py-1 text-[11px] font-bold ${p.si === v ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {v ? 'Sí' : 'No'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      inputMode="numeric"
                      value={p.cant ?? ''}
                      onChange={(e) => parte(item.clave, { cant: e.target.value === '' ? null : Number(e.target.value.replace(/\D/g, '')) })}
                      className="w-11 rounded border-0 bg-slate-50 py-1 text-center text-xs ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      aria-label={`Cantidad de ${item.etiqueta}`}
                    />
                    <div className="grid w-[6.5rem] grid-cols-3 gap-0.5">
                      {ESTADOS_PARTE.map((e) => (
                        <button key={e.valor} type="button" title={e.etiqueta} onClick={() => marcarEstado(item.clave, e.valor)} className={`rounded py-1 text-[11px] font-bold transition ${p.estado === e.valor ? e.clase : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                          {e.valor}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const selectorCombustible = (etiqueta: string, valor: number, cambiar: (v: number) => void) => (
    <div className="rounded-xl ring-1 ring-slate-300">
      <svg viewBox="0 0 360 125" className="w-full" aria-hidden>
        <Medidor nivel={valor} etiqueta={etiqueta} />
      </svg>
      <div className="grid grid-cols-5 border-t border-slate-200">
        {NIVELES_COMBUSTIBLE.map((n) => (
          <button key={n.valor} type="button" onClick={() => cambiar(n.valor)} className={`py-2 text-xs font-bold ${valor === n.valor ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}>
            {n.valor === 0 ? 'E' : n.valor === 100 ? 'F' : n.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={guardar} className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-400">
        {/* Encabezado */}
        <div className="grid border-b border-slate-400 sm:grid-cols-[1.2fr_1.2fr_1fr]">
          <div className="grid place-items-center bg-[#F6C143] px-3 py-3 text-center text-base font-black text-slate-900 sm:text-lg">DEPARTAMENTO OPERATIVO RSAD</div>
          <div className="grid place-items-center border-slate-400 px-3 py-3 text-center text-sm font-bold text-slate-800 sm:border-x">INVENTARIO FÍSICO ESTADO UNIDAD</div>
          <div className="space-y-0.5 px-3 py-2 text-xs text-slate-600">
            <p>Elaboró Aux. Operativo: <strong className="text-slate-900">{nombreUsuario(usuario)}</strong></p>
            <p>Fecha: <strong className="text-slate-900">{formatearFecha(hoyISO())}</strong></p>
          </div>
        </div>
        <div className="grid border-b border-slate-300 sm:grid-cols-[1fr_2fr]">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="text-xs font-semibold text-slate-500">Número de cono:</span>
            <span className="font-mono font-black text-slate-900">{unidad.unidad_eco}</span>
          </div>
          <label className="flex items-center gap-2 border-slate-300 px-3 sm:border-l">
            <span className="text-sm font-bold text-slate-700">Cliente:</span>
            <input {...campo('cliente')} className={claseCampo} />
          </label>
        </div>
        <label className="flex items-center gap-2 border-b border-slate-300 px-3">
          <span className="whitespace-nowrap text-[11px] font-bold uppercase text-slate-700">Condiciones tarjeta IAVE:</span>
          <input {...campo('tarjeta_iave')} className={claseCampo} />
        </label>

        {/* Franja amarilla */}
        <div className="grid grid-cols-2 border-b border-slate-300 sm:grid-cols-6">
          {CAMPOS_ENCABEZADO.map((c) => (
            <label key={c.clave} className="border-b border-r border-slate-300 sm:border-b-0">
              <span className={`block ${claseAmarillo}`}>{c.etiqueta}</span>
              <input {...campo(c.clave)} className={`${claseCampo} text-center`} />
            </label>
          ))}
        </div>
        <div className="grid border-b border-slate-300 sm:grid-cols-3">
          <label className="border-b border-slate-300 sm:border-b-0 sm:border-r">
            <span className={`block ${claseAmarillo}`}>Número del motor</span>
            <input {...campo('numero_motor')} className={`${claseCampo} text-center font-mono`} />
          </label>
          <label className="border-b border-slate-300 sm:border-b-0 sm:border-r">
            <span className={`block ${claseAmarillo}`}>Número de serie</span>
            <input {...campo('numero_serie')} className={`${claseCampo} text-center font-mono uppercase`} />
          </label>
          <label>
            <span className={`block ${claseAmarillo}`}>Kilometraje actual *</span>
            <input inputMode="numeric" value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} placeholder="km" className={`${claseCampo} text-center font-mono`} />
          </label>
        </div>
        <label className="block border-b border-slate-300 px-3 py-2">
          <span className="text-[11px] font-bold uppercase text-slate-700">Llantas y especificaciones:</span>
          <textarea rows={2} {...campo('llantas')} className={`${claseCampo} resize-none border-b border-dashed border-slate-300`} />
        </label>

        {/* Partes y accesorios */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">
            B = Bueno · R = Regular · M = Malo · <span className="font-semibold">{pendientes.length} sin marcar</span>
          </p>
          {pendientes.length > 0 && (
            <button type="button" onClick={marcarRestoBueno} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500">
              <CheckCheck className="h-4 w-4" /> Marcar el resto en B
            </button>
          )}
        </div>
        <div className="grid border-b border-slate-400 lg:grid-cols-3">{COLUMNAS_HOJA.map(bloque)}</div>

        {/* Observaciones */}
        <label className="block border-b border-slate-400 px-3 py-2">
          <span className="text-xs font-bold uppercase text-slate-700">Observaciones:</span>
          <textarea rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={`${claseCampo} resize-y`} />
        </label>

        {/* Golpes + combustible */}
        <div className="grid gap-4 p-3 xl:grid-cols-[1fr_260px]">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase text-slate-700">
                Golpes · toca el dibujo donde está el golpe <span className="text-red-600">({marcas.length})</span>
              </p>
              {marcas.length > 0 && (
                <button type="button" onClick={() => setMarcas([])} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600">
                  <Eraser className="h-3.5 w-3.5" /> Borrar marcas
                </button>
              )}
            </div>
            <HojaDanos marcas={marcas} alCambiar={setMarcas} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
            {selectorCombustible('LH', combustibleLH, setCombustibleLH)}
            {selectorCombustible('RH', combustibleRH, setCombustibleRH)}
          </div>
        </div>

        <label className="flex items-center gap-2 border-t border-slate-400 px-3 py-3">
          <span className="text-sm font-bold text-slate-700">Supervisor:</span>
          <input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} className={`${claseCampo} border-b border-slate-400`} />
        </label>
      </div>

      <button type="submit" disabled={guardando} className={`${claseBotonAcento} w-full py-3.5 text-base`}>
        {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
        {guardando ? 'Guardando…' : 'Guardar inventario y descargar Excel'}
      </button>
      <Aviso aviso={aviso.aviso} cerrar={aviso.cerrar} />
    </form>
  );
}
