'use client';

import type { DanoDiagrama, VistaDiagrama } from '@/types/supabase';
import { VISTAS_HOJA } from '@/lib/constantes';

/** Un golpe marcado con una ✕ sobre una de las vistas. */
export type Marca = Pick<DanoDiagrama, 'vista' | 'posicion_x' | 'posicion_y'>;

// Cada vista se dibuja en un viewBox de 400x220 y su contenedor usa la misma
// relación de aspecto (20/11), así posicion_x / posicion_y (0-100 %) caen en el
// mismo punto del dibujo al capturar, al consultar y en el Excel.
const ANCHO = 400;
const ALTO = 220;

const trazo = { fill: '#f1f5f9', stroke: '#334155', strokeWidth: 2, strokeLinejoin: 'round' as const };
const vidrio = { fill: '#e0f2fe', stroke: '#334155', strokeWidth: 1.5 };
const llanta = { fill: '#334155' };
const rin = { fill: '#cbd5e1' };

function Lateral() {
  return (
    <g>
      <rect x="40" y="140" width="330" height="10" rx="2" fill="#64748b" />
      <rect x="250" y="126" width="64" height="12" rx="3" {...trazo} />
      <rect x="232" y="18" width="7" height="112" rx="3" fill="#cbd5e1" stroke="#334155" />
      <path d="M28 150 L28 108 L60 96 L112 90 L124 44 L178 32 L228 32 L228 150 Z" {...trazo} />
      <path d="M128 54 L172 46 L172 86 L120 88 Z" {...vidrio} />
      <rect x="130" y="50" width="48" height="94" rx="4" fill="none" stroke="#334155" strokeWidth="1.5" />
      <rect x="148" y="124" width="62" height="22" rx="10" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
      <rect x="22" y="132" width="16" height="20" rx="3" fill="#cbd5e1" stroke="#334155" />
      {[85, 280, 336].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="160" r="25" {...llanta} />
          <circle cx={cx} cy="160" r="10" {...rin} />
        </g>
      ))}
    </g>
  );
}

function Frontal() {
  return (
    <g>
      <rect x="112" y="166" width="34" height="46" rx="6" {...llanta} />
      <rect x="254" y="166" width="34" height="46" rx="6" {...llanta} />
      <path d="M120 152 L120 44 Q120 26 140 24 L260 24 Q280 26 280 44 L280 152 Z" {...trazo} />
      <rect x="134" y="36" width="132" height="50" rx="8" {...vidrio} />
      <rect x="160" y="96" width="80" height="56" rx="4" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
      {[106, 118, 130, 142].map((y) => (
        <line key={y} x1="166" y1={y} x2="234" y2={y} stroke="#94a3b8" strokeWidth="2" />
      ))}
      <rect x="126" y="108" width="28" height="16" rx="4" fill="#fef9c3" stroke="#334155" strokeWidth="1.5" />
      <rect x="246" y="108" width="28" height="16" rx="4" fill="#fef9c3" stroke="#334155" strokeWidth="1.5" />
      <rect x="104" y="152" width="192" height="18" rx="5" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
      <rect x="96" y="48" width="14" height="34" rx="3" fill="#cbd5e1" stroke="#334155" />
      <rect x="290" y="48" width="14" height="34" rx="3" fill="#cbd5e1" stroke="#334155" />
    </g>
  );
}

function Trasera() {
  return (
    <g>
      <path d="M126 140 L126 30 Q126 20 136 20 L264 20 Q274 20 274 30 L274 140 Z" {...trazo} />
      <rect x="100" y="12" width="8" height="124" rx="3" fill="#cbd5e1" stroke="#334155" />
      <rect x="292" y="12" width="8" height="124" rx="3" fill="#cbd5e1" stroke="#334155" />
      <rect x="160" y="140" width="12" height="40" fill="#64748b" />
      <rect x="228" y="140" width="12" height="40" fill="#64748b" />
      <ellipse cx="200" cy="150" rx="46" ry="12" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
      {[96, 128, 240, 272].map((x) => (
        <rect key={x} x={x} y="160" width="32" height="50" rx="6" {...llanta} />
      ))}
      <rect x="150" y="186" width="100" height="10" rx="3" fill="#cbd5e1" stroke="#334155" />
    </g>
  );
}

function Superior() {
  return (
    <g>
      {[[70, 46], [70, 158], [265, 46], [265, 158], [320, 46], [320, 158]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="40" height="16" rx="4" {...llanta} />
      ))}
      <rect x="200" y="88" width="175" height="10" fill="#64748b" />
      <rect x="200" y="122" width="175" height="10" fill="#64748b" />
      <circle cx="300" cy="110" r="24" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
      <path d="M24 78 Q24 60 44 60 L200 60 L200 160 L44 160 Q24 160 24 142 Z" {...trazo} />
      <rect x="86" y="66" width="22" height="88" rx="4" {...vidrio} />
    </g>
  );
}

const DIBUJOS: Record<VistaDiagrama, () => React.ReactElement> = {
  lateral_izquierdo: Lateral,
  lateral_derecho: () => (
    <g transform={`translate(${ANCHO} 0) scale(-1 1)`}>
      <Lateral />
    </g>
  ),
  frontal: Frontal,
  trasera: Trasera,
  superior: Superior,
};

function Cruz({ x, y, tam = 11, grosor = 5 }: { x: number; y: number; tam?: number; grosor?: number }) {
  return (
    <g stroke="#dc2626" strokeWidth={grosor} strokeLinecap="round">
      <line x1={x - tam} y1={y - tam} x2={x + tam} y2={y + tam} />
      <line x1={x + tam} y1={y - tam} x2={x - tam} y2={y + tam} />
    </g>
  );
}

/** Medidor de combustible como el de la hoja (E … F) con la aguja en `nivel` %. */
export function Medidor({ nivel, etiqueta, ancho = 360, alto = 125 }: { nivel: number | null; etiqueta: string; ancho?: number; alto?: number }) {
  const cx = ancho / 2;
  const cy = alto - 18;
  const r = Math.min(ancho / 2 - 40, alto - 40);
  // Redondeado: si no, servidor y navegador difieren en el último decimal y React marca error de hidratación.
  const punto = (pct: number, radio: number) => {
    const ang = Math.PI - (pct / 100) * Math.PI;
    return [Math.round((cx + radio * Math.cos(ang)) * 10) / 10, Math.round((cy - radio * Math.sin(ang)) * 10) / 10];
  };
  const [ax, ay] = nivel === null ? [cx, cy] : punto(nivel, r - 8);
  return (
    <g fontFamily="Arial, sans-serif">
      <rect x="4" y="4" width={ancho - 8} height={alto - 8} rx="8" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
      <text x="16" y="26" fontSize="15" fontWeight="bold" fill="#334155">{etiqueta}</text>
      <text x={ancho - 16} y="24" fontSize="10" textAnchor="end" fill="#64748b">NIVEL DE COMBUSTIBLE</text>
      {Array.from({ length: 17 }, (_, i) => {
        const pct = (i / 16) * 100;
        const [x1, y1] = punto(pct, r);
        const [x2, y2] = punto(pct, i % 4 === 0 ? r - 14 : r - 8);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i < 3 ? '#dc2626' : '#334155'} strokeWidth={i % 4 === 0 ? 3 : 2} />;
      })}
      <text x={cx - r - 14} y={cy + 4} fontSize="16" fontWeight="bold" fill="#334155">E</text>
      <text x={cx + r + 4} y={cy + 4} fontSize="16" fontWeight="bold" fill="#334155">F</text>
      {nivel !== null && <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />}
      <circle cx={cx} cy={cy} r="7" fill="#334155" />
    </g>
  );
}

/**
 * Franja inferior de la hoja en una sola imagen: las 5 vistas con las ✕ y
 * los dos medidores de combustible (LH / RH). Se usa dentro del Excel.
 */
export function SvgHoja({ marcas, combustibleLH, combustibleRH }: { marcas: Marca[]; combustibleLH: number | null; combustibleRH: number | null }) {
  const TITULO = 30;
  const MEDIDORES = 360;
  const total = ANCHO * VISTAS_HOJA.length + MEDIDORES;
  const altoTotal = ALTO + TITULO;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${total} ${altoTotal}`} width={total} height={altoTotal}>
      <rect width="100%" height="100%" fill="#ffffff" />
      {VISTAS_HOJA.map((v, i) => {
        const Dibujo = DIBUJOS[v.valor];
        return (
          <g key={v.valor} transform={`translate(${i * ANCHO} 0)`}>
            <text x={ANCHO / 2} y="22" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="#334155">
              {v.etiqueta.toUpperCase()}
            </text>
            <g transform={`translate(0 ${TITULO})`}>
              <Dibujo />
              {marcas
                .filter((m) => m.vista === v.valor)
                .map((m, j) => (
                  // Más grande que en pantalla: en el Excel la franja se reduce a ~40 %.
                  <Cruz key={j} x={(m.posicion_x / 100) * ANCHO} y={(m.posicion_y / 100) * ALTO} tam={20} grosor={9} />
                ))}
            </g>
          </g>
        );
      })}
      <g transform={`translate(${ANCHO * VISTAS_HOJA.length} 0)`}>
        <Medidor nivel={combustibleLH} etiqueta="LH" ancho={MEDIDORES} alto={altoTotal / 2} />
        <g transform={`translate(0 ${altoTotal / 2})`}>
          <Medidor nivel={combustibleRH} etiqueta="RH" ancho={MEDIDORES} alto={altoTotal / 2} />
        </g>
      </g>
    </svg>
  );
}

/**
 * Las 5 vistas de la hoja. Con `alCambiar` es interactiva: tocar el dibujo pone
 * una ✕ y tocar una ✕ la quita. Sin `alCambiar` solo muestra las marcas.
 */
export default function HojaDanos({ marcas, alCambiar }: { marcas: Marca[]; alCambiar?: (marcas: Marca[]) => void }) {
  const marcar = (vista: VistaDiagrama) => (e: React.MouseEvent<HTMLDivElement>) => {
    if (!alCambiar) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    alCambiar([...marcas, { vista, posicion_x: x, posicion_y: y }]);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {VISTAS_HOJA.map((v) => {
        const Dibujo = DIBUJOS[v.valor];
        return (
          <div key={v.valor}>
            <p className="mb-1 text-center text-xs font-bold uppercase tracking-wider text-slate-500">{v.etiqueta}</p>
            <div
              onClick={marcar(v.valor)}
              className={`relative aspect-[20/11] w-full select-none overflow-hidden rounded-xl bg-white ring-1 ring-slate-300 ${alCambiar ? 'cursor-crosshair' : ''}`}
            >
              <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="absolute inset-0 h-full w-full" aria-hidden>
                <Dibujo />
              </svg>
              {marcas.map((m, i) =>
                m.vista !== v.valor ? null : (
                  <button
                    key={i}
                    type="button"
                    disabled={!alCambiar}
                    title={alCambiar ? 'Quitar marca' : 'Golpe'}
                    onClick={(e) => {
                      e.stopPropagation();
                      alCambiar?.(marcas.filter((_, j) => j !== i));
                    }}
                    style={{ left: `${m.posicion_x}%`, top: `${m.posicion_y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl font-black leading-none text-red-600 drop-shadow-[0_1px_0_white] transition enabled:hover:scale-125"
                  >
                    ✕
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
