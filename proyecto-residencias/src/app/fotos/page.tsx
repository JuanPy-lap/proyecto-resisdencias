'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Camera, CheckCircle2, ImagePlus, Loader2, Truck, XCircle } from 'lucide-react';
import { comprimirImagen, eliminarFotografia, getFotografiasPorUnidad, getUnidades, subirFotografia } from '@/services/api';
import { mensajeDeError, nombreUsuario, useAviso, useDatos, useUsuario } from '@/lib/hooks';
import { ETAPAS_FOTO } from '@/lib/constantes';
import type { EtapaFoto, FotografiaUnidad } from '@/types/supabase';
import SelectorUnidad from '@/components/SelectorUnidad';
import GaleriaFotos from '@/components/GaleriaFotos';
import { Aviso, AvisoConfiguracion, Cargando, Encabezado, ErrorCarga, Pagina, Tarjeta, Vacio, claseBotonPrimario } from '@/components/ui';

type ItemCola = { id: string; nombre: string; estado: 'subiendo' | 'listo' | 'error'; detalle?: string };

function ModuloFotos() {
  const router = useRouter();
  const params = useSearchParams();
  const usuario = useUsuario();
  const aviso = useAviso();
  const [cola, setCola] = useState<ItemCola[]>([]);

  const etapa = (ETAPAS_FOTO.find((e) => e.valor === params.get('etapa'))?.valor ?? 'Ingreso') as EtapaFoto;
  const infoEtapa = ETAPAS_FOTO.find((e) => e.valor === etapa)!;
  const desdeUnidad = params.get('unidad');

  const unidades = useDatos(getUnidades);
  // Solo unidades que están en la fase que corresponde a la etapa de fotos.
  const candidatas = (unidades.datos ?? []).filter((u) => infoEtapa.fases.includes(u.estado_unidad));
  // En Ingreso la unidad viene predeterminada: la indicada o la más reciente.
  const unidadId = desdeUnidad && candidatas.some((u) => u.id === desdeUnidad) ? desdeUnidad : etapa === 'Ingreso' ? (candidatas[0]?.id ?? '') : '';
  const unidad = candidatas.find((u) => u.id === unidadId);
  const fueraDeFase = desdeUnidad && unidades.datos && !candidatas.some((u) => u.id === desdeUnidad)
    ? unidades.datos.find((u) => u.id === desdeUnidad)
    : null;

  const fotos = useDatos(() => (unidadId ? getFotografiasPorUnidad(unidadId, etapa) : Promise.resolve([])), `${unidadId}-${etapa}`);
  const subiendo = cola.some((c) => c.estado === 'subiendo');

  const ir = (nuevaEtapa: EtapaFoto, id?: string) => {
    setCola([]);
    router.replace(`/fotos?etapa=${nuevaEtapa}${id ? `&unidad=${id}` : ''}`, { scroll: false });
  };

  const procesar = async (archivos: FileList | null) => {
    if (!archivos?.length || !unidad) return;
    const lista = Array.from(archivos);
    const nuevos: ItemCola[] = lista.map((f, i) => ({ id: `${Date.now()}-${i}`, nombre: f.name, estado: 'subiendo' }));
    setCola((c) => [...nuevos, ...c]);
    let ok = 0;
    // Una por una: en datos móviles subir varias a la vez satura la conexión.
    for (const [i, archivo] of lista.entries()) {
      const actualizar = (cambios: Partial<ItemCola>) => setCola((c) => c.map((x) => (x.id === nuevos[i].id ? { ...x, ...cambios } : x)));
      try {
        const comprimido = await comprimirImagen(archivo);
        const foto = await subirFotografia({ file: comprimido, unidadId: unidad.id, etapa, subidoPor: nombreUsuario(usuario) });
        fotos.setDatos((prev) => [foto, ...(prev ?? [])]);
        actualizar({ estado: 'listo', detalle: `${foto.peso_kb} KB` });
        ok++;
      } catch (err) {
        actualizar({ estado: 'error', detalle: mensajeDeError(err) });
      }
    }
    if (ok) aviso.exito(`${ok} foto(s) de ${etapa.toLowerCase()} guardadas en ${unidad.unidad_eco}.`);
  };

  const borrar = async (foto: FotografiaUnidad) => {
    try {
      await eliminarFotografia(foto);
      fotos.setDatos((prev) => (prev ?? []).filter((f) => f.id !== foto.id));
    } catch (err) {
      aviso.error(mensajeDeError(err));
    }
  };

  const listaFotos = fotos.datos ?? [];

  return (
    <Pagina>
      <Encabezado icono={Camera} seccion="Evidencia" titulo="Fotos" descripcion="Se comprimen solas antes de subirse y quedan en el expediente de la unidad." />
      <AvisoConfiguracion />
      {unidades.error && <ErrorCarga mensaje={unidades.error} reintentar={unidades.recargar} />}

      {/* Las tres etapas */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
        {ETAPAS_FOTO.map((e) => (
          <button
            key={e.valor}
            onClick={() => ir(e.valor, e.valor === etapa ? unidadId : undefined)}
            className={`rounded-xl px-2 py-3 text-center transition ${etapa === e.valor ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <span className="block text-sm font-bold sm:text-base">{e.valor}</span>
            <span className={`hidden text-xs sm:block ${etapa === e.valor ? 'text-amber-400' : 'text-slate-400'}`}>{e.descripcion}</span>
          </button>
        ))}
      </div>

      {unidades.cargando ? (
        <Cargando />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Tarjeta>
              <div className="space-y-4">
                {etapa === 'Ingreso' && unidad && candidatas.length === 1 ? (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-900 p-4 text-white">
                    <Truck className="h-6 w-6 text-amber-400" />
                    <div>
                      <p className="text-xs text-slate-400">Unidad en ingreso</p>
                      <p className="font-mono text-xl font-black">{unidad.unidad_eco}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">Unidad</p>
                    <SelectorUnidad unidades={candidatas} valor={unidadId} cambiar={(id) => ir(etapa, id)} />
                    <p className="mt-1 text-xs text-slate-400">Unidades en: {infoEtapa.fases.join(' / ')}</p>
                  </div>
                )}

                {fueraDeFase && (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
                    {fueraDeFase.unidad_eco} está en «{fueraDeFase.estado_unidad}»; las fotos de {etapa.toLowerCase()} son para unidades en {infoEtapa.fases.join(' o ')}.
                  </p>
                )}

                {candidatas.length === 0 ? (
                  <Vacio icono={Truck} titulo={`No hay unidades en ${infoEtapa.fases.join(' / ')}`} />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-amber-500 p-5 text-center text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 ${!unidad || subiendo ? 'pointer-events-none opacity-40' : ''}`}>
                      <Camera className="h-8 w-8" />
                      Tomar foto
                      <input type="file" accept="image/*" capture="environment" className="hidden" disabled={!unidad || subiendo} onChange={(e) => { procesar(e.target.files); e.target.value = ''; }} />
                    </label>
                    <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-white p-5 text-center text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 ${!unidad || subiendo ? 'pointer-events-none opacity-40' : ''}`}>
                      <ImagePlus className="h-8 w-8" />
                      Desde galería
                      <input type="file" accept="image/*" multiple className="hidden" disabled={!unidad || subiendo} onChange={(e) => { procesar(e.target.files); e.target.value = ''; }} />
                    </label>
                  </div>
                )}

                {cola.length > 0 && (
                  <ul className="space-y-1.5 border-t border-slate-100 pt-3">
                    {cola.slice(0, 6).map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-xs">
                        {item.estado === 'listo' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : item.estado === 'error' ? <XCircle className="h-4 w-4 shrink-0 text-red-500" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" />}
                        <span className="min-w-0 flex-1 truncate text-slate-600">{item.nombre}</span>
                        <span className={item.estado === 'error' ? 'text-red-600' : 'text-slate-400'}>{item.estado === 'subiendo' ? 'Subiendo…' : item.detalle}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Si vinieron desde la unidad, al terminar regresan a su siguiente tarea */}
                {desdeUnidad && unidad && listaFotos.length > 0 && !subiendo && (
                  <Link href={`/unidades/${unidad.id}?hecho=fotos`} className={`${claseBotonPrimario} w-full`}>
                    Listo, volver a {unidad.unidad_eco} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </Tarjeta>
          </div>

          <Tarjeta titulo={unidad ? `Fotos de ${etapa.toLowerCase()} · ${unidad.unidad_eco} (${listaFotos.length})` : `Fotos de ${etapa.toLowerCase()}`}>
            {!unidad ? (
              <Vacio icono={Camera} titulo="Elige una unidad" />
            ) : fotos.cargando ? (
              <Cargando />
            ) : fotos.error ? (
              <ErrorCarga mensaje={fotos.error} reintentar={fotos.recargar} />
            ) : listaFotos.length === 0 ? (
              <Vacio icono={ImagePlus} titulo="Sin fotos todavía" texto="Usa «Tomar foto» o «Desde galería»." />
            ) : (
              <GaleriaFotos fotos={listaFotos} alEliminar={borrar} />
            )}
          </Tarjeta>
        </div>
      )}
      <Aviso aviso={aviso.aviso} cerrar={aviso.cerrar} />
    </Pagina>
  );
}

export default function FotosPage() {
  return (
    <Suspense fallback={<Pagina><Cargando /></Pagina>}>
      <ModuloFotos />
    </Suspense>
  );
}
