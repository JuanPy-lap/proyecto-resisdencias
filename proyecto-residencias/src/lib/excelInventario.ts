import { createElement } from 'react';
import type { Alignment, Borders, Fill, Font, Worksheet } from 'exceljs';
import type { InventarioIngreso, Unidad } from '@/types/supabase';
import { formatearFecha } from '@/lib/constantes';
import { CAMPOS_ENCABEZADO, COLUMNAS_HOJA, type GrupoHoja, type ItemHoja } from '@/lib/hojaInventario';
import { SvgHoja, type Marca } from '@/components/DiagramaCamion';

// Genera el Excel con el mismo formato de la hoja impresa
// "INVENTARIO FÍSICO ESTADO UNIDAD" (Departamento Operativo RSAD):
// 15 columnas = 3 bloques de [Partes y accesorios | Cant | B | R | M].

const BORDE: Partial<Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};
const relleno = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const AMARILLO = relleno('FFF6C143');
const GRIS = relleno('FFD9D9D9');
const fuente = (extra: Partial<Font> = {}): Partial<Font> => ({ name: 'Arial', size: 8, ...extra });

type Estilo = { font?: Partial<Font>; fill?: Fill; alignment?: Partial<Alignment> };

/** Escribe un valor en el rango (r1,c1)-(r2,c2), lo combina y le pone borde a todo el rango. */
function celda(ws: Worksheet, r1: number, c1: number, r2: number, c2: number, valor: string | number, estilo: Estilo = {}) {
  if (r1 !== r2 || c1 !== c2) ws.mergeCells(r1, c1, r2, c2);
  const c = ws.getCell(r1, c1);
  c.value = valor;
  c.font = estilo.font ?? fuente();
  c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, ...estilo.alignment };
  for (let r = r1; r <= r2; r++) {
    for (let col = c1; col <= c2; col++) {
      ws.getCell(r, col).border = BORDE;
      if (estilo.fill) ws.getCell(r, col).fill = estilo.fill;
    }
  }
}

const CENTRO: Partial<Alignment> = { horizontal: 'center', vertical: 'middle' };

/** Dibuja la franja de vistas + medidores (SVG) en un canvas y la devuelve como PNG. */
async function franjaPng(marcas: Marca[], lh: number | null, rh: number | null) {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const svg = renderToStaticMarkup(createElement(SvgHoja, { marcas, combustibleLH: lh, combustibleRH: rh }));
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  return { base64: canvas.toDataURL('image/png'), proporcion: img.naturalHeight / img.naturalWidth };
}

type Renglon = { tipo: 'titulo'; grupo: GrupoHoja } | { tipo: 'item'; item: ItemHoja; sino: boolean };

function renglonesDeColumna(grupos: GrupoHoja[]): Renglon[] {
  return grupos.flatMap((g) => [
    ...(g.titulo ? [{ tipo: 'titulo' as const, grupo: g }] : []),
    ...g.items.map((item) => ({ tipo: 'item' as const, item, sino: !!g.sino })),
  ]);
}

export async function descargarExcelInventario(unidad: Unidad, inv: InventarioIngreso, marcas: Marca[]) {
  const [{ default: ExcelJS }, { saveAs }, franja] = await Promise.all([
    import('exceljs'),
    import('file-saver'),
    franjaPng(marcas, inv.nivel_combustible, inv.nivel_combustible_rh),
  ]);

  const libro = new ExcelJS.Workbook();
  libro.creator = 'NGR Taller';
  const ws = libro.addWorksheet('Inventario', {
    pageSetup: {
      // Sin paperSize = tamaño carta (el predeterminado de Excel).
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 },
    },
  });
  ws.columns = Array.from({ length: 15 }, (_, i) => ({ width: [25, 5, 4.2, 4.2, 4.2][i % 5] }));

  const d = inv.datos_hoja ?? {};
  const negrita = (size = 8) => fuente({ bold: true, size });

  // --- Encabezado
  celda(ws, 1, 1, 2, 5, 'DEPARTAMENTO OPERATIVO RSAD', { font: negrita(13), fill: AMARILLO, alignment: CENTRO });
  celda(ws, 1, 6, 2, 10, 'INVENTARIO FÍSICO ESTADO UNIDAD', { font: negrita(11), alignment: CENTRO });
  celda(ws, 1, 11, 1, 15, `Elaboró Aux. Operativo: ${inv.capturado_por}`, { font: fuente({ size: 8 }) });
  celda(ws, 2, 11, 2, 15, `Fecha: ${formatearFecha(inv.created_at)}`, { font: fuente({ size: 8 }) });
  ws.getRow(1).height = 18;
  ws.getRow(2).height = 18;
  celda(ws, 3, 1, 3, 5, `Número de cono: ${unidad.unidad_eco}`, { font: negrita(9) });
  celda(ws, 3, 6, 3, 15, `Cliente: ${d.cliente ?? ''}`, { font: negrita(10) });
  celda(ws, 4, 1, 4, 15, `CONDICIONES TARJETA IAVE: ${d.tarjeta_iave ?? ''}`, { font: negrita(8) });

  // Franja amarilla CIA | MARCA | TIPO | MODELO | PLACAS | COLOR
  const tramos: [number, number][] = [[1, 2], [3, 5], [6, 7], [8, 10], [11, 12], [13, 15]];
  CAMPOS_ENCABEZADO.forEach((campo, i) => {
    const [c1, c2] = tramos[i];
    celda(ws, 5, c1, 5, c2, campo.etiqueta.toUpperCase(), { font: negrita(), fill: AMARILLO, alignment: CENTRO });
    celda(ws, 6, c1, 6, c2, d[campo.clave] ?? '', { alignment: CENTRO });
  });
  celda(ws, 7, 1, 7, 5, 'NÚMERO DEL MOTOR', { font: negrita(), fill: AMARILLO, alignment: CENTRO });
  celda(ws, 7, 6, 7, 10, 'NÚMERO DE SERIE', { font: negrita(), fill: AMARILLO, alignment: CENTRO });
  celda(ws, 7, 11, 7, 15, 'KILOMETRAJE ACTUAL', { font: negrita(), fill: AMARILLO, alignment: CENTRO });
  celda(ws, 8, 1, 8, 5, d.numero_motor ?? '', { alignment: CENTRO });
  celda(ws, 8, 6, 8, 10, d.numero_serie ?? '', { alignment: CENTRO });
  celda(ws, 8, 11, 8, 15, `${inv.kilometraje.toLocaleString('es-MX')} km`, { alignment: CENTRO });
  celda(ws, 9, 1, 11, 3, 'LLANTAS Y ESPECIFICACIONES:', { font: negrita() });
  celda(ws, 9, 4, 11, 15, d.llantas ?? '', { alignment: { vertical: 'top' } });

  // --- Encabezado de la tabla (3 bloques)
  for (let b = 0; b < 3; b++) {
    const c = b * 5 + 1;
    celda(ws, 12, c, 13, c, 'PARTES Y ACCESORIOS', { font: negrita(), fill: GRIS, alignment: CENTRO });
    celda(ws, 12, c + 1, 13, c + 1, 'Cant', { font: negrita(7), fill: GRIS, alignment: { ...CENTRO, textRotation: 90 } });
    celda(ws, 12, c + 2, 12, c + 4, 'Estado', { font: negrita(7), fill: GRIS, alignment: CENTRO });
    ['B', 'R', 'M'].forEach((e, i) => celda(ws, 13, c + 2 + i, 13, c + 2 + i, e, { font: negrita(7), fill: GRIS, alignment: CENTRO }));
  }

  // --- Renglones de partes y accesorios
  const columnas = COLUMNAS_HOJA.map(renglonesDeColumna);
  const totalRenglones = Math.max(...columnas.map((c) => c.length));
  const PRIMERA = 14;
  columnas.forEach((renglones, b) => {
    const c = b * 5 + 1;
    for (let i = 0; i < totalRenglones; i++) {
      const fila = PRIMERA + i;
      const r = renglones[i];
      if (!r) {
        celda(ws, fila, c, fila, c, '');
        for (let k = 1; k <= 4; k++) celda(ws, fila, c + k, fila, c + k, '');
      } else if (r.tipo === 'titulo') {
        if (r.grupo.sino) {
          celda(ws, fila, c, fila, c, r.grupo.titulo ?? '', { font: negrita(), fill: GRIS });
          celda(ws, fila, c + 1, fila, c + 2, 'SI', { font: negrita(), fill: GRIS, alignment: CENTRO });
          celda(ws, fila, c + 3, fila, c + 4, 'NO', { font: negrita(), fill: GRIS, alignment: CENTRO });
        } else {
          // El título ocupa todo el bloque (como en la hoja) para que quepan los largos.
          celda(ws, fila, c, fila, c + 4, r.grupo.titulo ?? '', { font: negrita(), fill: GRIS, alignment: { wrapText: false } });
        }
      } else {
        const parte = inv.checklist?.[r.item.clave] ?? {};
        celda(ws, fila, c, fila, c, r.item.etiqueta);
        if (r.sino) {
          celda(ws, fila, c + 1, fila, c + 2, parte.si === true ? 'X' : '', { font: negrita(), alignment: CENTRO });
          celda(ws, fila, c + 3, fila, c + 4, parte.si === false ? 'X' : '', { font: negrita(), alignment: CENTRO });
        } else {
          celda(ws, fila, c + 1, fila, c + 1, parte.cant ?? '', { alignment: CENTRO });
          (['B', 'R', 'M'] as const).forEach((e, k) =>
            celda(ws, fila, c + 2 + k, fila, c + 2 + k, parte.estado === e ? 'X' : '', { font: negrita(), alignment: CENTRO })
          );
        }
      }
      // Altura elegida para que la hoja llene una página carta, igual que el formato impreso.
      ws.getRow(fila).height = 15.5;
    }
  });

  // --- Observaciones
  let fila = PRIMERA + totalRenglones;
  celda(ws, fila, 1, fila + 4, 15, `OBSERVACIONES: ${inv.observaciones ?? ''}`, { font: fuente({ size: 9 }), alignment: { vertical: 'top' } });
  fila += 5;

  // --- Vistas del tractocamión con los golpes + medidores LH / RH
  const anchoImagen = 960;
  const filasImagen = 7;
  celda(ws, fila, 1, fila + filasImagen - 1, 15, '');
  const imagen = libro.addImage({ base64: franja.base64, extension: 'png' });
  ws.addImage(imagen, { tl: { col: 0.1, row: fila - 1 + 0.15 }, ext: { width: anchoImagen, height: anchoImagen * franja.proporcion } });
  for (let i = 0; i < filasImagen; i++) ws.getRow(fila + i).height = 15;
  fila += filasImagen;

  // --- Pie: empresa y supervisor
  celda(ws, fila, 1, fila + 1, 5, 'RSAD · Refacciones y Servicio Automotriz Denisse', { font: negrita(9), alignment: CENTRO });
  celda(ws, fila, 6, fila + 1, 15, `Supervisor: ${inv.supervisor ?? ''}`, { font: negrita(11), alignment: { horizontal: 'center', vertical: 'bottom' } });
  ws.getRow(fila).height = 16;
  ws.getRow(fila + 1).height = 16;

  const buffer = await libro.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Inventario_${unidad.unidad_eco}_${inv.created_at.slice(0, 10)}.xlsx`
  );
}
