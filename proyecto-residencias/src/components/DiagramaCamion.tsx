'use client';

import type { DanoDiagrama, VistaDiagrama } from '@/types/supabase';
import { infoTipoDano } from '@/lib/constantes';

type Punto = Pick<DanoDiagrama, 'posicion_x' | 'posicion_y' | 'tipo_dano' | 'descripcion'>;

// Todas las vistas comparten viewBox 400x220 y el contenedor la misma relación
// de aspecto, así posicion_x / posicion_y (0-100 %) caen en el mismo lugar del
// dibujo al capturar y al consultar.
const trazo = { fill: '#e2e8f0', stroke: '#334155', strokeWidth: 2, strokeLinejoin: 'round' as const };
const vidrio = { fill: '#bae6fd', stroke: '#334155', strokeWidth: 1.5 };
const llanta = { fill: '#1e293b' };
const rin = { fill: '#94a3b8' };

function Lateral() {
  return (
    <g>
      <rect x="40" y="140" width="330" height="10" rx="2" fill="#475569" />
      <rect x="250" y="126" width="64" height="12" rx="3" {...trazo} />
      <rect x="232" y="18" width="7" height="112" rx="3" fill="#94a3b8" stroke="#334155" />
      <path d="M28 150 L28 108 L60 96 L112 90 L124 44 L178 32 L228 32 L228 150 Z" {...trazo} />
      <path d="M128 54 L172 46 L172 86 L120 88 Z" {...vidrio} />
      <rect x="130" y="50" width="48" height="94" rx="4" fill="none" stroke="#334155" strokeWidth="1.5" />
      <rect x="182" y="46" width="40" height="40" rx="4" fill="none" stroke="#64748b" strokeWidth="1.2" />
      <rect x="148" y="124" width="62" height="22" rx="10" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
      <rect x="22" y="132" width="16" height="20" rx="3" fill="#94a3b8" stroke="#334155" />
      <rect x="30" y="112" width="12" height="9" rx="2" fill="#fde68a" stroke="#334155" />
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
      <line x1="200" y1="36" x2="200" y2="86" stroke="#334155" strokeWidth="1.5" />
      <rect x="160" y="96" width="80" height="56" rx="4" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
      {[106, 116, 126, 136, 146].map((y) => (
        <line key={y} x1="166" y1={y} x2="234" y2={y} stroke="#64748b" strokeWidth="2" />
      ))}
      <rect x="126" y="108" width="28" height="16" rx="4" fill="#fde68a" stroke="#334155" strokeWidth="1.5" />
      <rect x="246" y="108" width="28" height="16" rx="4" fill="#fde68a" stroke="#334155" strokeWidth="1.5" />
      <rect x="104" y="152" width="192" height="18" rx="5" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
      <rect x="96" y="48" width="14" height="34" rx="3" fill="#94a3b8" stroke="#334155" />
      <rect x="290" y="48" width="14" height="34" rx="3" fill="#94a3b8" stroke="#334155" />
    </g>
  );
}

function Trasera() {
  return (
    <g>
      <path d="M126 140 L126 30 Q126 20 136 20 L264 20 Q274 20 274 30 L274 140 Z" {...trazo} />
      <rect x="100" y="12" width="8" height="124" rx="3" fill="#94a3b8" stroke="#334155" />
      <rect x="292" y="12" width="8" height="124" rx="3" fill="#94a3b8" stroke="#334155" />
      <rect x="160" y="140" width="12" height="40" fill="#475569" />
      <rect x="228" y="140" width="12" height="40" fill="#475569" />
      <ellipse cx="200" cy="150" rx="46" ry="12" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
      {[96, 128, 240, 272].map((x) => (
        <rect key={x} x={x} y="160" width="32" height="50" rx="6" {...llanta} />
      ))}
      <rect x="88" y="178" width="10" height="34" fill="#0f172a" />
      <rect x="302" y="178" width="10" height="34" fill="#0f172a" />
      <rect x="150" y="186" width="100" height="10" rx="3" fill="#94a3b8" stroke="#334155" />
      <rect x="152" y="188" width="14" height="6" rx="2" fill="#f87171" />
      <rect x="234" y="188" width="14" height="6" rx="2" fill="#f87171" />
    </g>
  );
}

function Superior() {
  return (
    <g>
      {[[70, 46], [70, 158], [265, 46], [265, 158], [320, 46], [320, 158]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="40" height="16" rx="4" {...llanta} />
      ))}
      <rect x="200" y="88" width="175" height="10" fill="#475569" />
      <rect x="200" y="122" width="175" height="10" fill="#475569" />
      <circle cx="300" cy="110" r="24" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
      <path d="M24 78 Q24 60 44 60 L200 60 L200 160 L44 160 Q24 160 24 142 Z" {...trazo} />
      <rect x="36" y="70" width="44" height="80" rx="8" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
      <rect x="86" y="66" width="22" height="88" rx="4" {...vidrio} />
      <rect x="114" y="66" width="80" height="88" rx="6" fill="none" stroke="#64748b" strokeWidth="1.2" />
      <rect x="200" y="62" width="8" height="10" rx="2" fill="#94a3b8" />
      <rect x="200" y="148" width="8" height="10" rx="2" fill="#94a3b8" />
    </g>
  );
}

const DIBUJOS: Record<VistaDiagrama, () => React.ReactElement> = {
  lateral_izquierdo: Lateral,
  lateral_derecho: () => (
    <g transform="translate(400 0) scale(-1 1)">
      <Lateral />
    </g>
  ),
  frontal: Frontal,
  trasera: Trasera,
  superior: Superior,
};

export default function DiagramaCamion({
  vista,
  puntos,
  alMarcar,
  alSeleccionar,
  seleccionado,
  compacto = false,
}: {
  vista: VistaDiagrama;
  puntos: Punto[];
  /** Si se pasa, el diagrama es interactivo: un clic agrega un punto en (x, y) %. */
  alMarcar?: (x: number, y: number) => void;
  alSeleccionar?: (indice: number) => void;
  seleccionado?: number | null;
  compacto?: boolean;
}) {
  const Dibujo = DIBUJOS[vista];

  const marcar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!alMarcar) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    alMarcar(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  return (
    <div
      onClick={marcar}
      className={`fondo-plano relative aspect-[20/11] w-full select-none overflow-hidden rounded-xl ring-1 ring-slate-200 ${alMarcar ? 'cursor-crosshair' : ''}`}
    >
      <svg viewBox="0 0 400 220" className="absolute inset-0 h-full w-full" aria-hidden>
        <Dibujo />
      </svg>
      {puntos.map((p, i) => {
        const info = infoTipoDano(p.tipo_dano);
        const activo = seleccionado === i;
        return (
          <button
            key={i}
            type="button"
            title={`${info.etiqueta}${p.descripcion ? `: ${p.descripcion}` : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar?.(i);
            }}
            style={{ left: `${p.posicion_x}%`, top: `${p.posicion_y}%`, backgroundColor: info.color }}
            className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-bold text-white shadow-lg ring-2 ring-white transition ${
              compacto ? 'h-4 w-4 text-[8px]' : 'h-6 w-6 text-[10px]'
            } ${activo ? 'scale-125 ring-4 ring-amber-300' : 'hover:scale-110'}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
