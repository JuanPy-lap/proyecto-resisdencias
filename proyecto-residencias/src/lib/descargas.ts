import type { FotografiaUnidad } from '@/types/supabase';

/**
 * Descarga todas las fotos de una unidad en un ZIP organizado por etapa:
 *   C-2499_expediente.zip / Ingreso / Frontal_01.jpg ...
 * jszip y file-saver se importan dinámicamente para no cargarlos en cada página.
 */
export async function descargarExpedienteZip(
  unidadEco: string,
  fotos: FotografiaUnidad[],
  alProgresar?: (hechas: number, total: number) => void
) {
  const [{ default: JSZip }, { saveAs }] = await Promise.all([import('jszip'), import('file-saver')]);
  const zip = new JSZip();
  const contadores = new Map<string, number>();

  let hechas = 0;
  for (const foto of fotos) {
    const respuesta = await fetch(foto.url_publica);
    if (!respuesta.ok) throw new Error(`No se pudo descargar ${foto.ruta_storage}`);
    const blob = await respuesta.blob();

    const seccion = (foto.seccion || 'General').replace(/[^\wáéíóúñÁÉÍÓÚÑ -]+/g, '');
    const clave = `${foto.etapa}/${seccion}`;
    const n = (contadores.get(clave) ?? 0) + 1;
    contadores.set(clave, n);
    const extension = foto.ruta_storage.split('.').pop() || 'jpg';

    zip.folder(foto.etapa)!.file(`${seccion}_${String(n).padStart(2, '0')}.${extension}`, blob);
    alProgresar?.(++hechas, fotos.length);
  }

  const contenido = await zip.generateAsync({ type: 'blob' });
  saveAs(contenido, `${unidadEco}_expediente.zip`);
}
