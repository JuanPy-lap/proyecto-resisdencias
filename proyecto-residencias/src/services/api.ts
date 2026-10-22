import { supabase, BUCKET_FOTOS } from '@/lib/supabase';
import type {
  Unidad,
  UnidadInsert,
  UnidadUpdate,
  InventarioIngresoInsert,
  DanoDiagramaInsert,
  InventarioIngreso,
  InventarioConDanos,
  DanoDiagrama,
  FotografiaUnidad,
  FotografiaUnidadInsert,
  FotografiaConUnidad,
  EtapaFoto,
  EtiquetaQRRastreo,
  EtiquetaQRRastreoInsert,
  EtiquetaQRRastreoUpdate,
  EtiquetaQRConUnidad,
  EstadoQR,
} from '@/types/supabase';

// =============================================================================
// UNIDADES
// =============================================================================

/** Lista todas las unidades, más recientes primero. */
export async function getUnidades(): Promise<Unidad[]> {
  const { data, error } = await supabase
    .from('unidades')
    .select('*')
    .order('fecha_ingreso', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getUnidades] Error:', error.message);
    throw new Error(`No se pudieron cargar las unidades: ${error.message}`);
  }
  return data ?? [];
}

/** Trae una unidad por id (null si no existe). */
export async function getUnidad(id: string): Promise<Unidad | null> {
  const { data, error } = await supabase.from('unidades').select('*').eq('id', id).maybeSingle();

  if (error) {
    console.error('[getUnidad] Error:', error.message);
    throw new Error(`No se pudo cargar la unidad: ${error.message}`);
  }
  return data;
}

/** Crea una unidad nueva (p. ej. al dar de alta un tractocamión en recepción). */
export async function createUnidad(nuevaUnidad: UnidadInsert): Promise<Unidad> {
  const { data, error } = await supabase
    .from('unidades')
    .insert({
      ...nuevaUnidad,
      unidad_eco: nuevaUnidad.unidad_eco.trim().toUpperCase(),
      estado_unidad: nuevaUnidad.estado_unidad ?? 'Ingreso',
    })
    .select()
    .single();

  if (error) {
    console.error('[createUnidad] Error:', error.message);
    // 23505 = unique_violation (unidad_eco repetido)
    if (error.code === '23505') {
      throw new Error(`Ya existe una unidad con el económico ${nuevaUnidad.unidad_eco.toUpperCase()}.`);
    }
    throw new Error(`No se pudo crear la unidad: ${error.message}`);
  }
  return data;
}

/** Actualiza datos de una unidad (estado, responsable, fecha compromiso...). */
export async function actualizarUnidad(id: string, cambios: UnidadUpdate): Promise<Unidad> {
  const { data, error } = await supabase.from('unidades').update(cambios).eq('id', id).select().single();

  if (error) {
    console.error('[actualizarUnidad] Error:', error.message);
    throw new Error(`No se pudo actualizar la unidad: ${error.message}`);
  }
  return data;
}

// =============================================================================
// INVENTARIO + DAÑOS (flujo combinado)
// =============================================================================

interface GuardarInventarioParams {
  inventario: InventarioIngresoInsert;
  danos: Omit<DanoDiagramaInsert, 'inventario_id'>[];
}

interface GuardarInventarioResult {
  inventario: InventarioIngreso;
  danos: DanoDiagrama[];
}

/**
 * Guarda el inventario de ingreso y, acto seguido, todos sus puntos de daño
 * marcados en el diagrama, enlazándolos por inventario_id.
 *
 * Supabase (PostgREST) no expone transacciones multi-tabla desde el cliente
 * del navegador, así que simulamos atomicidad "a mano": si falla la
 * inserción de los daños, revertimos (borramos) el inventario recién creado
 * para no dejar un registro huérfano a medias.
 */
export async function guardarInventarioCompleto({
  inventario,
  danos,
}: GuardarInventarioParams): Promise<GuardarInventarioResult> {
  // 1) Insertar el inventario y recuperar su id generado
  const { data: inventarioGuardado, error: errorInventario } = await supabase
    .from('inventarios_ingreso')
    .insert(inventario)
    .select()
    .single();

  if (errorInventario || !inventarioGuardado) {
    console.error('[guardarInventarioCompleto] Error inventario:', errorInventario?.message);
    throw new Error(`No se pudo guardar el inventario: ${errorInventario?.message}`);
  }

  // Si no se marcó ningún daño, terminamos aquí.
  if (danos.length === 0) {
    return { inventario: inventarioGuardado, danos: [] };
  }

  // 2) Insertar los puntos de daño ya enlazados al inventario
  const danosConFK: DanoDiagramaInsert[] = danos.map((d) => ({
    ...d,
    inventario_id: inventarioGuardado.id,
  }));

  const { data: danosGuardados, error: errorDanos } = await supabase
    .from('danos_diagrama')
    .insert(danosConFK)
    .select();

  if (errorDanos) {
    console.error('[guardarInventarioCompleto] Error daños, revirtiendo inventario:', errorDanos.message);
    // Rollback manual: eliminar el inventario huérfano
    await supabase.from('inventarios_ingreso').delete().eq('id', inventarioGuardado.id);
    throw new Error(`No se pudieron guardar los daños del diagrama: ${errorDanos.message}`);
  }

  return { inventario: inventarioGuardado, danos: danosGuardados ?? [] };
}

/** Inventarios (con sus daños) de una unidad o, sin unidadId, todos. Más recientes primero. */
export async function getInventarios(unidadId?: string): Promise<InventarioConDanos[]> {
  let query = supabase
    .from('inventarios_ingreso')
    .select('*, danos_diagrama(*)')
    .order('created_at', { ascending: false });

  if (unidadId) {
    query = query.eq('unidad_id', unidadId);
  }

  const { data, error } = await query.overrideTypes<InventarioConDanos[], { merge: false }>();

  if (error) {
    console.error('[getInventarios] Error:', error.message);
    throw new Error(`No se pudieron cargar los inventarios: ${error.message}`);
  }
  return data ?? [];
}

// =============================================================================
// FOTOGRAFÍAS (Storage + tabla fotografias_unidad)
// =============================================================================

interface SubirFotografiaParams {
  file: File;
  unidadId: string;
  etapa: EtapaFoto;
  seccion?: string;
  subidoPor: string;
}

/**
 * Comprime la imagen en el navegador antes de subirla (máx. ~0.8 MB y 1920 px),
 * así las fotos tomadas con el celular no saturan el bucket ni los datos móviles.
 * Se importa dinámicamente porque la librería usa APIs del navegador.
 */
export async function comprimirImagen(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 300 * 1024) return file;

  const { default: imageCompression } = await import('browser-image-compression');
  try {
    const comprimida = await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.82,
    });
    const nombre = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([comprimida], nombre, { type: 'image/jpeg' });
  } catch (err) {
    // Si la compresión falla (formato raro), se sube el original.
    console.warn('[comprimirImagen] Se sube el archivo original:', err);
    return file;
  }
}

/**
 * Sube un archivo de imagen al bucket `fotos-tractocamiones`, obtiene su
 * URL pública y registra la foto en `fotografias_unidad`.
 * Ruta en Storage: {unidad_id}/{etapa}/{timestamp}-{nombre_archivo}
 * (esto evita colisiones de nombres y mantiene las fotos organizadas por unidad/etapa).
 */
export async function subirFotografia({
  file,
  unidadId,
  etapa,
  seccion,
  subidoPor,
}: SubirFotografiaParams): Promise<FotografiaUnidad> {
  const nombreSanitizado = file.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '_');
  const rutaStorage = `${unidadId}/${etapa}/${Date.now()}-${nombreSanitizado}`;

  // 1) Subir el binario al bucket
  const { error: errorUpload } = await supabase.storage.from(BUCKET_FOTOS).upload(rutaStorage, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });

  if (errorUpload) {
    console.error('[subirFotografia] Error de Storage:', errorUpload.message);
    throw new Error(`No se pudo subir la imagen: ${errorUpload.message}`);
  }

  // 2) Obtener la URL pública (el bucket ya está configurado como público)
  const { data: urlData } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(rutaStorage);

  // 3) Registrar la fotografía en la tabla, incluyendo su peso en KB
  const registro: FotografiaUnidadInsert = {
    unidad_id: unidadId,
    etapa,
    seccion: seccion ?? null,
    url_publica: urlData.publicUrl,
    ruta_storage: rutaStorage,
    peso_kb: Math.max(1, Math.round(file.size / 1024)),
    subido_por: subidoPor,
  };

  const { data: fotoGuardada, error: errorInsert } = await supabase
    .from('fotografias_unidad')
    .insert(registro)
    .select()
    .single();

  if (errorInsert) {
    console.error('[subirFotografia] Error al registrar foto, limpiando Storage:', errorInsert.message);
    // Si falla el registro en BD, no dejamos el archivo huérfano en Storage.
    await supabase.storage.from(BUCKET_FOTOS).remove([rutaStorage]);
    throw new Error(`No se pudo registrar la fotografía: ${errorInsert.message}`);
  }

  return fotoGuardada;
}

/** Lista las fotografías de una unidad, opcionalmente filtradas por etapa. */
export async function getFotografiasPorUnidad(unidadId: string, etapa?: EtapaFoto): Promise<FotografiaUnidad[]> {
  let query = supabase
    .from('fotografias_unidad')
    .select('*')
    .eq('unidad_id', unidadId)
    .order('created_at', { ascending: false });

  if (etapa) {
    query = query.eq('etapa', etapa);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getFotografiasPorUnidad] Error:', error.message);
    throw new Error(`No se pudieron cargar las fotografías: ${error.message}`);
  }
  return data ?? [];
}

/** Últimas fotografías de todas las unidades (para el dashboard). */
export async function getFotografiasRecientes(limite = 8): Promise<FotografiaConUnidad[]> {
  const { data, error } = await supabase
    .from('fotografias_unidad')
    .select('*, unidades(id, unidad_eco)')
    .order('created_at', { ascending: false })
    .limit(limite)
    .overrideTypes<FotografiaConUnidad[], { merge: false }>();

  if (error) {
    console.error('[getFotografiasRecientes] Error:', error.message);
    throw new Error(`No se pudieron cargar las fotografías recientes: ${error.message}`);
  }
  return data ?? [];
}

/** Borra una fotografía del Storage y de la tabla. */
export async function eliminarFotografia(foto: FotografiaUnidad): Promise<void> {
  const { error: errorDb } = await supabase.from('fotografias_unidad').delete().eq('id', foto.id);
  if (errorDb) {
    console.error('[eliminarFotografia] Error:', errorDb.message);
    throw new Error(`No se pudo eliminar la fotografía: ${errorDb.message}`);
  }
  // El registro ya no existe; si falla el borrado del archivo solo se loguea.
  const { error: errorStorage } = await supabase.storage.from(BUCKET_FOTOS).remove([foto.ruta_storage]);
  if (errorStorage) {
    console.warn('[eliminarFotografia] Archivo no borrado de Storage:', errorStorage.message);
  }
}

// =============================================================================
// QR / RASTREO
// =============================================================================

const SELECT_QR_CON_UNIDAD = '*, unidades(id, unidad_eco, estado_unidad)';

/** Todas las etiquetas QR con datos básicos de su unidad (opcionalmente de una sola unidad). */
export async function getEtiquetasQR(unidadId?: string): Promise<EtiquetaQRConUnidad[]> {
  let query = supabase
    .from('etiquetas_qr_rastreo')
    .select(SELECT_QR_CON_UNIDAD)
    .order('created_at', { ascending: false });

  if (unidadId) {
    query = query.eq('unidad_id', unidadId);
  }

  const { data, error } = await query.overrideTypes<EtiquetaQRConUnidad[], { merge: false }>();

  if (error) {
    console.error('[getEtiquetasQR] Error:', error.message);
    throw new Error(`No se pudieron cargar las etiquetas QR: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Trae las etiquetas QR que requieren atención: las que no se han retirado.
 * Esto alimenta el panel de alertas para liberar una unidad sin dejar QRs
 * olvidados en el chasis/cabina.
 */
export async function getAlertasQR(): Promise<EtiquetaQRConUnidad[]> {
  const { data, error } = await supabase
    .from('etiquetas_qr_rastreo')
    .select(SELECT_QR_CON_UNIDAD)
    .neq('estado', 'Retirada')
    .order('fecha_colocacion', { ascending: true })
    .overrideTypes<EtiquetaQRConUnidad[], { merge: false }>();

  if (error) {
    console.error('[getAlertasQR] Error:', error.message);
    throw new Error(`No se pudieron cargar las alertas de QR: ${error.message}`);
  }
  return data ?? [];
}

/** Registra una etiqueta QR nueva para una unidad. Si se marca como colocada, fija la fecha. */
export async function crearEtiquetaQR(etiqueta: EtiquetaQRRastreoInsert): Promise<EtiquetaQRRastreo> {
  const estado = etiqueta.estado ?? 'Pendiente';
  const { data, error } = await supabase
    .from('etiquetas_qr_rastreo')
    .insert({
      ...etiqueta,
      codigo_qr: etiqueta.codigo_qr.trim().toUpperCase(),
      estado,
      fecha_colocacion: estado === 'Colocada' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error('[crearEtiquetaQR] Error:', error.message);
    if (error.code === '23505') {
      throw new Error(`El código QR ${etiqueta.codigo_qr.toUpperCase()} ya está registrado.`);
    }
    throw new Error(`No se pudo registrar la etiqueta QR: ${error.message}`);
  }
  return data;
}

/**
 * Cambia el estado de una etiqueta QR (p. ej. de 'Colocada' a 'Retirada').
 * Si el nuevo estado es 'Retirada', registra fecha_retiro y retirado_por automáticamente.
 */
export async function cambiarEstadoQR(id: string, nuevoEstado: EstadoQR, retiradoPor?: string): Promise<EtiquetaQRRastreo> {
  const cambios: EtiquetaQRRastreoUpdate = { estado: nuevoEstado };

  if (nuevoEstado === 'Retirada') {
    cambios.fecha_retiro = new Date().toISOString();
    cambios.retirado_por = retiradoPor ?? null;
  }
  if (nuevoEstado === 'Colocada') {
    cambios.fecha_colocacion = new Date().toISOString();
    cambios.fecha_retiro = null;
    cambios.retirado_por = null;
  }

  const { data, error } = await supabase.from('etiquetas_qr_rastreo').update(cambios).eq('id', id).select().single();

  if (error) {
    console.error('[cambiarEstadoQR] Error:', error.message);
    throw new Error(`No se pudo actualizar la etiqueta QR: ${error.message}`);
  }
  return data;
}

/** Mueve una etiqueta a otro taller / rack (lo usa el mapa del taller). */
export async function moverEtiquetaQR(id: string, taller: string, ubicacionRack: string | null): Promise<EtiquetaQRRastreo> {
  const { data, error } = await supabase
    .from('etiquetas_qr_rastreo')
    .update({ taller, ubicacion_rack: ubicacionRack })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[moverEtiquetaQR] Error:', error.message);
    throw new Error(`No se pudo mover la etiqueta QR: ${error.message}`);
  }
  return data;
}
