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
  HistorialEstado,
} from '@/types/supabase';
import { siguienteEstado } from '@/lib/constantes';
import { RESUMEN_VACIO, type ResumenUnidad } from '@/lib/fases';

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
      throw new Error(`Ya existe una unidad con el cono ${nuevaUnidad.unidad_eco.toUpperCase()}.`);
    }
    throw new Error(`No se pudo crear la unidad: ${error.message}`);
  }
  return data;
}

/** Actualiza datos de una unidad (responsable, fecha compromiso...). Para la fase usa avanzarFase(). */
export async function actualizarUnidad(id: string, cambios: UnidadUpdate): Promise<Unidad> {
  const { data, error } = await supabase.from('unidades').update(cambios).eq('id', id).select().single();

  if (error) {
    console.error('[actualizarUnidad] Error:', error.message);
    // P0001 = raise exception del trigger de fases: su mensaje ya está en español.
    if (error.code === 'P0001') throw new Error(error.message);
    throw new Error(`No se pudo actualizar la unidad: ${error.message}`);
  }
  return data;
}

/**
 * Pasa la unidad a la siguiente fase. Solo se avanza de una en una y nunca se
 * regresa; además de esta validación, el trigger de la BD lo impide.
 */
export async function avanzarFase(unidad: Unidad): Promise<Unidad> {
  const siguiente = siguienteEstado(unidad.estado_unidad);
  if (!siguiente) throw new Error('La unidad ya fue entregada.');
  return actualizarUnidad(unidad.id, { estado_unidad: siguiente });
}

/** Fechas en que se registró cada fase de la unidad (lo llena el trigger). */
export async function getHistorialEstados(unidadId: string): Promise<HistorialEstado[]> {
  const { data, error } = await supabase
    .from('historial_estados')
    .select('*')
    .eq('unidad_id', unidadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getHistorialEstados] Error:', error.message);
    throw new Error(`No se pudo cargar el historial de fases: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Conteo de inventarios, fotos por etapa y QR por unidad, para saber qué
 * tarea le falta a cada una (dashboard). Trae solo columnas mínimas.
 */
export async function getResumenUnidades(): Promise<Map<string, ResumenUnidad>> {
  const [fotos, inventarios, etiquetas] = await Promise.all([
    supabase.from('fotografias_unidad').select('unidad_id, etapa'),
    supabase.from('inventarios_ingreso').select('unidad_id'),
    supabase.from('etiquetas_qr_rastreo').select('unidad_id, estado'),
  ]);
  const error = fotos.error ?? inventarios.error ?? etiquetas.error;
  if (error) {
    console.error('[getResumenUnidades] Error:', error.message);
    throw new Error(`No se pudo calcular el avance de las unidades: ${error.message}`);
  }

  const resumen = new Map<string, ResumenUnidad>();
  const de = (id: string) => {
    if (!resumen.has(id)) resumen.set(id, structuredClone(RESUMEN_VACIO));
    return resumen.get(id)!;
  };
  fotos.data?.forEach((f) => de(f.unidad_id).fotos[f.etapa]++);
  inventarios.data?.forEach((i) => de(i.unidad_id).inventarios++);
  etiquetas.data?.forEach((q) => {
    const r = de(q.unidad_id);
    r.qrTotal++;
    if (q.estado === 'Colocada') r.qrColocados++;
  });
  return resumen;
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

const SELECT_QR_CON_UNIDAD = '*, unidades(id, unidad_eco, estado_unidad, fecha_compromiso)';

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
    .order('fecha_retiro_programada', { ascending: true, nullsFirst: false })
    .overrideTypes<EtiquetaQRConUnidad[], { merge: false }>();

  if (error) {
    console.error('[getAlertasQR] Error:', error.message);
    throw new Error(`No se pudieron cargar las alertas de QR: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Registra un QR ya colocado. El mismo cono puede tener varios QR (uno por
 * taller); solo se rechaza repetir cono + taller mientras siga colocado.
 */
export async function crearEtiquetaQR(etiqueta: EtiquetaQRRastreoInsert): Promise<EtiquetaQRRastreo> {
  const codigo = etiqueta.codigo_qr.trim().toUpperCase();
  const { data, error } = await supabase
    .from('etiquetas_qr_rastreo')
    .insert({ ...etiqueta, codigo_qr: codigo, estado: 'Colocada' })
    .select()
    .single();

  if (error) {
    console.error('[crearEtiquetaQR] Error:', error.message);
    // 23505 = índice único (cono + taller) de QR que siguen colocados
    if (error.code === '23505') {
      throw new Error(`El cono ${codigo} ya tiene un QR colocado en ${etiqueta.taller}. Retíralo antes de colocar otro en ese taller.`);
    }
    throw new Error(`No se pudo registrar el QR: ${error.message}`);
  }
  return data;
}

/** Marca un QR como retirado, con la fecha y el usuario que lo retiró. */
export async function retirarEtiquetaQR(id: string, retiradoPor: string): Promise<EtiquetaQRRastreo> {
  const cambios: EtiquetaQRRastreoUpdate = {
    estado: 'Retirada',
    fecha_retiro: new Date().toISOString(),
    retirado_por: retiradoPor,
  };
  const { data, error } = await supabase.from('etiquetas_qr_rastreo').update(cambios).eq('id', id).select().single();

  if (error) {
    console.error('[retirarEtiquetaQR] Error:', error.message);
    throw new Error(`No se pudo retirar el QR: ${error.message}`);
  }
  return data;
}

/** Borra el registro de un QR (p. ej. si se capturó por error). */
export async function eliminarEtiquetaQR(id: string): Promise<void> {
  const { error } = await supabase.from('etiquetas_qr_rastreo').delete().eq('id', id);

  if (error) {
    console.error('[eliminarEtiquetaQR] Error:', error.message);
    throw new Error(`No se pudo eliminar el QR: ${error.message}`);
  }
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
