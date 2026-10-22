'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, CheckCircle2, FileArchive, ImagePlus, Loader2, Plus, XCircle } from 'lucide-react';
import { comprimirImagen, eliminarFotografia, getFotografiasPorUnidad, getUnidades, subirFotografia } from '@/services/api';
import { mensajeDeError, nombreUsuario, useAviso, useDatos, useUsuario } from '@/lib/hooks';
import { descargarExpedienteZip } from '@/lib/descargas';
import { ETAPAS_FOTO, SECCIONES_FOTO } from '@/lib/constantes';
import type { EtapaFoto, FotografiaUnidad } from '@/types/supabase';
import SelectorUnidad from '@/components/SelectorUnidad';
import FormularioUnidad from '@/components/FormularioUnidad';
import GaleriaFotos from '@/components/GaleriaFotos';
import {
  Aviso,
  AvisoConfiguracion,
  Cargando,
  Encabezado,
  ErrorCarga,
  Pagina,
  Tarjeta,
  Vacio,
  claseBotonSecundario,
} from '@/components/ui';

type ItemCola = { id: string; nombre: string; estado: 'comprimiendo' | 'subiendo' | 'listo' | 'error'; detalle?: string };

function ModuloCamara() {
  const router = useRouter();
  const params = useSearchParams();
  const usuario = useUsuario();
  const aviso = useAviso();

  const unidadId = params.get('unidad') ?? '';
  const [etapa, setEtapa] = useState<EtapaFoto>('Ingreso');
  const [seccion, setSeccion] = useState('General');
  const [cola, setCola] = useState<ItemCola[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [progresoZip, setProgresoZip] = useState<string | null>(null);

  const unidades = useDatos(getUnidades);
  const fotos = useDatos(() => (unidadId ? getFotografiasPorUnidad(unidadId) : Promise.resolve([])), unidadId);

  const unidad = unidades.datos?.find((u) => u.id === unidadId);
  const listaFotos = fotos.datos ?? [];
  const fotosEtapa = listaFotos.filter((f) => f.etapa === etapa);
  const subiendo = cola.some((c) => c.estado === 'comprimiendo' || c.estado === 'subiendo');

  // La unidad seleccionada vive en la URL: se puede compartir o volver con "atrás".
  const seleccionarUnidad = (id: string) => router.replace(id ? `/camara?unidad=${id}` : '/camara', { scroll: false });

  const actualizarItem = (id: string, cambios: Partial<ItemCola>) =>
    setCola((c) => c.map((item) => (item.id === id ? { ...item, ...cambios } : item)));

  const procesarArchivos = async (archivos: FileList | null) => {
    if (!archivos?.length || !unidadId) return;
    const nuevos: ItemCola[] = Array.from(archivos).map((f, i) => ({ id: `${Date.now()}-${i}`, nombre: f.name, estado: 'comprimiendo' }));
    setCola((c) => [...nuevos, ...c.filter((x) => x.estado !== 'listo')]);

    let exitosas = 0;
    // Secuencial a propósito: en datos móviles subir varias a la vez satura la conexión.
    for (const [i, archivo] of Array.from(archivos).entries()) {
      const item = nuevos[i];
      try {
        const comprimido = await comprimirImagen(archivo);
        actualizarItem(item.id, { estado: 'subiendo', detalle: `${Math.round(archivo.size / 1024)} KB → ${Math.round(comprimido.size / 1024)} KB` });
        const foto = await subirFotografia({ file: comprimido, unidadId, etapa, seccion, subidoPor: nombreUsuario(usuario) });
        fotos.setDatos((prev) => [foto, ...(prev ?? [])]);
        actualizarItem(item.id, { estado: 'listo' });
        exitosas++;
      } catch (err) {
        actualizarItem(item.id, { estado: 'error', detalle: mensajeDeError(err) });
      }
    }
    if (exitosas) aviso.exito(`${exitosas} foto(s) agregadas al expediente de ${unidad?.unidad_eco ?? 'la unidad'}.`);
  };

  const borrarFoto = async (foto: FotografiaUnidad) => {
    try {
      await eliminarFotografia(foto);
      fotos.setDatos((prev) => (prev ?? []).filter((f) => f.id !== foto.id));
      aviso.exito('Fotografía eliminada.');
    } catch (err) {
      aviso.error(mensajeDeError(err));
    }
  };

  const descargarZip = async () => {
    if (!unidad) return;
    setProgresoZip('…');
    try {
      await descargarExpedienteZip(unidad.unidad_eco, listaFotos, (h, t) => setProgresoZip(`${h}/${t}`));
    } catch (err) {
      aviso.error(mensajeDeError(err));
    } finally {
      setProgresoZip(null);
    }
  };

  return (
    <Pagina>
      <Encabezado
        icono={Camera}
        seccion="Evidencia"
        titulo="Captura fotográfica"
        descripcion="Las fotos se comprimen en el teléfono antes de subirse y quedan ligadas al expediente de la unidad."
      />

      <AvisoConfiguracion />
      {unidades.error && <ErrorCarga mensaje={unidades.error} reintentar={unidades.recargar} />}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Panel de captura */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Tarjeta>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">1 · Unidad</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SelectorUnidad unidades={unidades.datos ?? []} valor={unidadId} cambiar={seleccionarUnidad} />
                  </div>
                  <button onClick={() => setMostrarForm(true)} className={`${claseBotonSecundario} px-3`} title="Registrar unidad nueva">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {unidad && (
                  <Link href={`/unidades/${unidad.id}`} className="mt-1.5 inline-block text-xs font-semibold text-amber-600 hover:underline">
                    Ver expediente de {unidad.unidad_eco} →
                  </Link>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">2 · Etapa</p>
                <div className="grid grid-cols-3 gap-2">
                  {ETAPAS_FOTO.map((e) => {
                    const n = listaFotos.filter((f) => f.etapa === e.valor).length;
                    return (
                      <button
                        key={e.valor}
                        onClick={() => setEtapa(e.valor)}
                        className={`rounded-xl p-3 text-left ring-1 transition ${etapa === e.valor ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}
                      >
                        <span className="block text-sm font-bold">{e.valor}</span>
                        <span className={`text-xs ${etapa === e.valor ? 'text-amber-400' : 'text-slate-400'}`}>{n} fotos</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{ETAPAS_FOTO.find((e) => e.valor === etapa)?.descripcion}</p>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">3 · Sección</p>
                <div className="flex flex-wrap gap-1.5">
                  {SECCIONES_FOTO.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeccion(s)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${seccion === s ? 'bg-amber-500 text-slate-950 ring-amber-500' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-amber-500 p-4 text-center text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 ${!unidadId || subiendo ? 'pointer-events-none opacity-40' : ''}`}>
                  <Camera className="h-7 w-7" />
                  Tomar foto
                  <input type="file" accept="image/*" capture="environment" className="hidden" disabled={!unidadId || subiendo} onChange={(e) => { procesarArchivos(e.target.files); e.target.value = ''; }} />
                </label>
                <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 ${!unidadId || subiendo ? 'pointer-events-none opacity-40' : ''}`}>
                  <ImagePlus className="h-7 w-7" />
                  Desde galería
                  <input type="file" accept="image/*" multiple className="hidden" disabled={!unidadId || subiendo} onChange={(e) => { procesarArchivos(e.target.files); e.target.value = ''; }} />
                </label>
              </div>
              {!unidadId && <p className="text-center text-xs text-slate-500">Selecciona una unidad para habilitar la cámara.</p>}
            </div>
          </Tarjeta>

          {cola.length > 0 && (
            <Tarjeta titulo="Cola de subida" acciones={!subiendo && <button onClick={() => setCola([])} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Limpiar</button>}>
              <ul className="space-y-2">
                {cola.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 text-sm">
                    {item.estado === 'listo' ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : item.estado === 'error' ? (
                      <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                    ) : (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-700">{item.nombre}</p>
                      <p className={`truncate text-xs ${item.estado === 'error' ? 'text-red-600' : 'text-slate-400'}`}>
                        {item.estado === 'comprimiendo' ? 'Comprimiendo…' : item.estado === 'subiendo' ? `Subiendo · ${item.detalle}` : item.detalle}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>

        {/* Galería */}
        <Tarjeta
          titulo={unidad ? `${unidad.unidad_eco} · ${etapa}` : 'Expediente fotográfico'}
          acciones={
            unidad && listaFotos.length > 0 && (
              <button onClick={descargarZip} disabled={!!progresoZip} className={`${claseBotonSecundario} px-3 py-1.5 text-xs`}>
                {progresoZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
                {progresoZip ? `ZIP ${progresoZip}` : `ZIP (${listaFotos.length})`}
              </button>
            )
          }
        >
          {!unidadId ? (
            <Vacio icono={Camera} titulo="Elige una unidad" texto="Aquí verás las fotografías de la etapa seleccionada." />
          ) : fotos.cargando ? (
            <Cargando />
          ) : fotos.error ? (
            <ErrorCarga mensaje={fotos.error} reintentar={fotos.recargar} />
          ) : fotosEtapa.length === 0 ? (
            <Vacio icono={ImagePlus} titulo={`Sin fotos de ${etapa.toLowerCase()}`} texto="Usa «Tomar foto» o «Desde galería» para agregarlas." />
          ) : (
            <GaleriaFotos fotos={fotosEtapa} alEliminar={borrarFoto} />
          )}
        </Tarjeta>
      </div>

      {mostrarForm && (
        <FormularioUnidad
          cerrar={() => setMostrarForm(false)}
          alCrear={(u) => {
            setMostrarForm(false);
            unidades.setDatos((prev) => [u, ...(prev ?? [])]);
            seleccionarUnidad(u.id);
            aviso.exito(`Unidad ${u.unidad_eco} registrada.`);
          }}
        />
      )}
      <Aviso aviso={aviso.aviso} cerrar={aviso.cerrar} />
    </Pagina>
  );
}

export default function CamaraPage() {
  return (
    <Suspense fallback={<Pagina><Cargando /></Pagina>}>
      <ModuloCamara />
    </Suspense>
  );
}
