import { createClient } from '@supabase/supabase-js';
import { Unidad, FotografiasUnidad, InventarioIngreso } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 1. OBTENER Y CREAR UNIDADES ---
export async function getUnidades(): Promise<Unidad[]> {
  const { data, error } = await supabase
    .from('unidades')
    .select('*')
    .order('creado_el', { ascending: false });

  if (error) {
    console.error('Error al obtener unidades:', error.message);
    return [];
  }
  return data || [];
}

export async function crearUnidad(unidad: Omit<Unidad, 'id'>): Promise<Unidad | null> {
  const { data, error } = await supabase
    .from('unidades')
    .insert([unidad])
    .select()
    .single();

  if (error) {
    console.error('Error al crear unidad:', error.message);
    throw error;
  }
  return data;
}

// --- 2. SUBIR FOTOGRAFÍAS A SUPABASE STORAGE Y REGISTRAR EN DB ---
export async function subirFotografiaUnidad(
  file: File,
  unidadId: string,
  etapa: 'Ingreso' | 'Proceso' | 'Terminado',
  seccion: string = 'General'
): Promise<FotografiasUnidad | null> {
  try {
    // A) Generar un nombre único para la imagen en el Storage
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filePath = `${unidadId}/${etapa.toLowerCase()}_${timestamp}.${fileExtension}`;
    const pesoKB = Math.round(file.size / 1024); // Guardamos el peso real en KB

    // B) Subir la imagen al Bucket "fotos-tractocamiones"
    const { error: uploadError } = await supabase.storage
      .from('fotos-tractocamiones')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Error en Storage: ${uploadError.message}`);
    }

    // C) Obtener la URL Pública accesible de la fotografía
    const { data: publicUrlData } = supabase.storage
      .from('fotos-tractocamiones')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // D) Guardar el metadato en la tabla "fotografias_unidad"
    const { data: fotoRecord, error: dbError } = await supabase
      .from('fotografias_unidad')
      .insert([
        {
          unidad_id: unidadId,
          etapa: etapa,
          seccion: seccion,
          url_publica: publicUrl,
          ruta_storage: filePath,
          peso_kb: pesoKB,
          subido_por: 'Operador Nugar',
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return fotoRecord;
  } catch (err: any) {
    console.error('Error al subir fotografía:', err.message || err);
    throw err;
  }
}

// --- 3. OBTENER FOTOS DE UNA UNIDAD ---
export async function getFotografiasPorUnidad(unidadId: string): Promise<FotografiasUnidad[]> {
  const { data, error } = await supabase
    .from('fotografias_unidad')
    .select('*')
    .eq('unidad_id', unidadId)
    .order('creado_el', { ascending: false });

  if (error) {
    console.error('Error al consultar fotografías:', error.message);
    return [];
  }
  return data || [];
}