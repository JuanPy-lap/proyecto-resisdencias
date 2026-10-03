'use client';

import { useState, useEffect } from 'react';
import { 
  getUnidades, 
  crearUnidad, 
  subirFotografiaUnidad, 
  getFotografiasPorUnidad 
} from '@/lib/supabaseServices';
import { Unidad, FotografiasUnidad } from '@/types/database';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';

export default function CamaraPage() {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>('');
  const [nuevaEco, setNuevaEco] = useState<string>('');
  const [etapa, setEtapa] = useState<'Ingreso' | 'Proceso' | 'Terminado'>('Ingreso');
  const [fotos, setFotos] = useState<FotografiasUnidad[]>([]);
  
  const [subiendo, setSubiendo] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Cargar unidades al iniciar
  useEffect(() => {
    cargarUnidades();
  }, []);

  // Cargar fotos cuando se selecciona una unidad
  useEffect(() => {
    if (selectedUnidadId) {
      cargarFotos(selectedUnidadId);
    }
  }, [selectedUnidadId]);

  const cargarUnidades = async () => {
    const data = await getUnidades();
    setUnidades(data);
    if (data.length > 0 && !selectedUnidadId) {
      setSelectedUnidadId(data[0].id);
    }
  };

  const cargarFotos = async (unidadId: string) => {
    const data = await getFotografiasPorUnidad(unidadId);
    setFotos(data);
  };

  const handleCrearUnidadRapida = async () => {
    if (!nuevaEco.trim()) return;
    try {
      const nueva = await crearUnidad({
        unidad_eco: nuevaEco.toUpperCase(),
        estado_unidad: 'Ingreso',
        cliente_aseguradora: 'Corporativo Nugar'
      });
      if (nueva) {
        setNuevaEco('');
        await cargarUnidades();
        setSelectedUnidadId(nueva.id);
        setMensaje({ tipo: 'exito', texto: `Unidad ${nueva.unidad_eco} creada correctamente.` });
      }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'La unidad ya existe o hubo un error.' });
    }
  };

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedUnidadId) return;

    const file = files[0];
    setSubiendo(true);
    setMensaje(null);

    try {
      const fotoSubida = await subirFotografiaUnidad(file, selectedUnidadId, etapa);
      if (fotoSubida) {
        setMensaje({ 
          tipo: 'exito', 
          texto: `¡Foto subida con éxito! Peso: ${fotoSubida.peso_kb} KB` 
        });
        await cargarFotos(selectedUnidadId);
      }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: `Error al subir la imagen: ${err.message}` });
    } finally {
      setSubiendo(false);
      e.target.value = ''; // Limpiar el input
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Encabezado */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Camera className="w-8 h-8 text-blue-600" />
          Captura Fotográfica Inteligente
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Módulo para registrar fotografías de Ingreso, Proceso y Terminado sincronizadas directamente con Supabase Storage[cite: 1].
        </p>
      </div>

      {/* Alertas / Mensajes */}
      {mensaje && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="font-medium text-sm">{mensaje.texto}</span>
        </div>
      )}

      {/* Panel de Selección y Configuración */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {/* Selección de Unidad */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            1. Selecciona la Unidad / Económico
          </label>
          <select 
            value={selectedUnidadId}
            onChange={(e) => setSelectedUnidadId(e.target.value)}
            className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unidad_eco} - Estado: {u.estado_unidad}
              </option>
            ))}
          </select>

          {/* Crear Unidad si no existe */}
          <div className="mt-4 flex gap-2">
            <input 
              type="text"
              placeholder="Ej: ECO-500"
              value={nuevaEco}
              onChange={(e) => setNuevaEco(e.target.value)}
              className="flex-1 p-2 border rounded-lg text-sm text-gray-900"
            />
            <button 
              onClick={handleCrearUnidadRapida}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            >
              + Agregar
            </button>
          </div>
        </div>

        {/* Selección de Etapa de Fotografía */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            2. Etapa de la Fotografía[cite: 1]
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Ingreso', 'Proceso', 'Terminado'] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEtapa(e)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                  etapa === e 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Botón para Subir Foto */}
          <div className="mt-6">
            <label className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer transition font-medium text-sm ${
              subiendo ? 'bg-gray-100 border-gray-300 text-gray-400' : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
            }`}>
              {subiendo ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  Subiendo a Supabase Storage...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Tomar o Seleccionar Fotografía
                </>
              )}
              <input 
                type="file" 
                accept="image/*"
                capture="environment" 
                onChange={handleSubirFoto}
                disabled={subiendo || !selectedUnidadId}
                className="hidden" 
              />
            </label>
          </div>
        </div>
      </div>

      {/* Galería de Fotografías en Tiempo Real desde Supabase */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-gray-600" />
          Expediente Fotográfico ({fotos.length} imágenes registradas)
        </h2>

        {fotos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">No hay fotografías registradas para esta unidad en Supabase.</p>
            <p className="text-xs text-gray-400 mt-1">Sube una foto arriba para probar la conexión del bucket.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {fotos.map((f) => (
              <div key={f.id} className="border rounded-lg overflow-hidden bg-gray-50 shadow-sm hover:shadow-md transition">
                <div className="h-48 w-full relative bg-gray-200">
                  <img 
                    src={f.url_publica} 
                    alt={`Foto ${f.etapa}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-blue-600 uppercase">{f.etapa}</span>
                    <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{f.peso_kb} KB</span>
                  </div>
                  <p className="text-gray-500 text-[10px] truncate">Ruta: {f.ruta_storage}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}