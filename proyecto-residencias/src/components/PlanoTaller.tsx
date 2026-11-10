'use client';

import type { EtiquetaQRConUnidad } from '@/types/supabase';
import {
  ALTO_PLANO,
  ANCHO_PLANO,
  AREAS_PLANO,
  ESTILO_ALERTA,
  PESO_ALERTA,
  nivelAlerta,
  type AreaPlano,
  type NivelAlerta,
} from '@/lib/plano';

// =============================================================================
// Plano a escala del patio (vista aérea). Cada taller es un rectángulo que se
// pinta según el QR más urgente que tenga dentro (semáforo), con los números de
// cono de las unidades como fichas. Tocar un taller lo selecciona; en modo
// "mover", tocar un taller manda ahí la unidad elegida.
// =============================================================================

const BASE: Record<AreaPlano['tipo'], { relleno: string; borde: string }> = {
  taller: { relleno: '#1e293b', borde: '#475569' },
  lavado: { relleno: '#0c4a6e', borde: '#0ea5e9' },
  pintura: { relleno: '#3b0764', borde: '#a855f7' },
};

const FICHA_W = 36;
const FICHA_H = 15;

type Props = {
  porArea: Map<string, EtiquetaQRConUnidad[]>;
  areaSeleccionada: string | null;
  qrSeleccionado: string | null;
  /** Áreas que coinciden con la búsqueda; null = sin búsqueda activa. */
  resaltadas: Set<string> | null;
  modoMover: boolean;
  alTocarArea: (area: AreaPlano) => void;
  alTocarQr: (q: EtiquetaQRConUnidad) => void;
};

export function nivelDeArea(qrs: EtiquetaQRConUnidad[]): NivelAlerta | null {
  if (qrs.length === 0) return null;
  return qrs.map(nivelAlerta).reduce((a, b) => (PESO_ALERTA[b] > PESO_ALERTA[a] ? b : a), 'ok' as NivelAlerta);
}

export default function PlanoTaller({ porArea, areaSeleccionada, qrSeleccionado, resaltadas, modoMover, alTocarArea, alTocarQr }: Props) {
  return (
    <svg
      viewBox={`0 0 ${ANCHO_PLANO} ${ALTO_PLANO}`}
      className="block h-auto w-full min-w-[760px] select-none"
      role="img"
      aria-label="Plano del patio con la ubicación de las unidades por taller"
    >
      <defs>
        <pattern id="plano-cuadricula" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#1e293b" strokeWidth="1" />
        </pattern>
        <pattern id="plano-pasto" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#052e16" />
          <circle cx="2" cy="2" r="1" fill="#14532d" />
          <circle cx="6" cy="6" r="1" fill="#166534" />
        </pattern>
        <filter id="plano-brillo" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Fondo y terreno */}
      <rect width={ANCHO_PLANO} height={ALTO_PLANO} fill="#020617" />
      <rect width={ANCHO_PLANO} height={ALTO_PLANO} fill="url(#plano-cuadricula)" />

      {/* Calle interior frente a la nave norte */}
      <rect x={20} y={124} width={972} height={40} rx={4} fill="#334155" />
      <line x1={130} y1={144} x2={740} y2={144} stroke="#fbbf24" strokeWidth={2} strokeDasharray="14 12" opacity={0.6} />
      <line x1={890} y1={144} x2={985} y2={144} stroke="#fbbf24" strokeWidth={2} strokeDasharray="14 12" opacity={0.6} />
      <text x={815} y={148} textAnchor="middle"fill="#cbd5e1" fontSize={10} fontWeight={700} letterSpacing={3} opacity={0.7}>
        CALLE INTERIOR
      </text>

      {/* Patio de maniobras */}
      <rect x={124} y={168} width={453} height={396} rx={6} fill="#0f172a" stroke="#1e293b" />
      <Estacionamiento x={186} y={182} columnas={10} filas={2} />
      <Estacionamiento x={186} y={360} columnas={11} filas={3} />
      <text x={350} y={322} textAnchor="middle" fill="#64748b" fontSize={13} fontWeight={800} letterSpacing={6}>
        PATIO DE MANIOBRAS
      </text>
      <text x={350} y={338} textAnchor="middle" fill="#475569" fontSize={10} letterSpacing={2}>
        unidades en espera de taller
      </text>

      {/* Área verde y colindancia */}
      <rect x={598} y={186} width={386} height={230} rx={8} fill="url(#plano-pasto)" stroke="#14532d" />
      <text x={791} y={306} textAnchor="middle" fill="#4ade80" fontSize={12} fontWeight={700} letterSpacing={4} opacity={0.6}>
        ÁREA VERDE
      </text>
      <rect x={598} y={430} width={386} height={216} rx={8} fill="none" stroke="#1e293b" strokeDasharray="6 6" />
      <text x={791} y={542} textAnchor="middle" fill="#334155" fontSize={11} letterSpacing={3}>
        FUERA DE LA EMPRESA
      </text>

      {/* Rótulos de zona */}
      <Rotulo x={130} y={176} texto="NAVE NORTE ↑" />
      <Rotulo x={128} y={556} texto="NAVE SUR ↓" />
      <text x={14} y={410} fill="#64748b" fontSize={10} fontWeight={800} letterSpacing={4} transform="rotate(-90 14 410)" textAnchor="middle">
        ALA PONIENTE
      </text>

      {/* Talleres */}
      {AREAS_PLANO.map((area) => (
        <Area
          key={area.id}
          area={area}
          qrs={porArea.get(area.id) ?? []}
          seleccionada={areaSeleccionada === area.id}
          qrSeleccionado={qrSeleccionado}
          atenuada={resaltadas !== null && !resaltadas.has(area.id)}
          modoMover={modoMover}
          alTocarArea={alTocarArea}
          alTocarQr={alTocarQr}
        />
      ))}
    </svg>
  );
}

function Area({
  area,
  qrs,
  seleccionada,
  qrSeleccionado,
  atenuada,
  modoMover,
  alTocarArea,
  alTocarQr,
}: {
  area: AreaPlano;
  qrs: EtiquetaQRConUnidad[];
  seleccionada: boolean;
  qrSeleccionado: string | null;
  atenuada: boolean;
  modoMover: boolean;
  alTocarArea: (area: AreaPlano) => void;
  alTocarQr: (q: EtiquetaQRConUnidad) => void;
}) {
  const { x, y, w, h } = area;
  const nivel = nivelDeArea(qrs);
  const color = nivel ? ESTILO_ALERTA[nivel].color : null;
  const base = BASE[area.tipo];
  const vertical = w < 50;

  // Fichas con el número de cono que caben dentro del taller.
  const columnas = vertical ? 0 : Math.floor((w - 6) / (FICHA_W + 3));
  const filas = vertical ? 0 : Math.floor((h - 26) / (FICHA_H + 3));
  const capacidad = columnas * filas;
  const visibles = capacidad >= qrs.length ? qrs : qrs.slice(0, Math.max(0, capacidad - 1));
  const sobrantes = qrs.length - visibles.length;
  const anchoFichas = Math.min(qrs.length, columnas) * (FICHA_W + 3) - 3;
  const inicioX = x + (w - anchoFichas) / 2;

  const tocar = () => alTocarArea(area);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${area.nombre}: ${qrs.length} QR colocados`}
      onClick={tocar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tocar();
        }
      }}
      className="cursor-pointer outline-none transition-opacity duration-300 [&:focus-visible>rect:first-of-type]:stroke-white"
      opacity={atenuada ? 0.25 : 1}
    >
      <title>{`${area.nombre}${area.porConfirmar ? ' (nombre por confirmar)' : ''} · ${qrs.length} QR`}</title>

      {/* Halo para talleres con QR críticos */}
      {nivel === 'critico' && (
        <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={5} fill="none" stroke={color!} strokeWidth={4} filter="url(#plano-brillo)" className="animate-pulse" />
      )}

      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={h - 4}
        rx={5}
        fill={color ? `${color}26` : base.relleno}
        stroke={seleccionada ? '#ffffff' : (color ?? base.borde)}
        strokeWidth={seleccionada ? 3 : color ? 2.5 : 1.25}
        strokeDasharray={modoMover && !seleccionada ? '6 4' : undefined}
        className={modoMover ? 'hover:fill-amber-500/30' : 'hover:brightness-125'}
      />
      {/* Láminas del techo (detalle visual) */}
      {!vertical && h > 60 && (
        <path
          d={Array.from({ length: Math.floor((w - 10) / 14) }, (_, i) => `M${x + 9 + i * 14} ${y + 8}v${h - 16}`).join('')}
          stroke="#ffffff"
          strokeOpacity={0.035}
          strokeWidth={6}
          pointerEvents="none"
        />
      )}

      {/* Nombre */}
      {vertical ? (
        <text
          x={x + w / 2}
          y={y + h / 2}
          transform={`rotate(-90 ${x + w / 2} ${y + h / 2})`}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color ? '#ffffff' : '#cbd5e1'}
          fontSize={w < 36 ? 9 : 10}
          fontWeight={700}
          pointerEvents="none"
        >
          {area.corto}
        </text>
      ) : (
        <text x={x + w / 2} y={y + 17} textAnchor="middle" fill={color ? '#ffffff' : '#cbd5e1'} fontSize={w < 80 || area.corto.length > 9 ? 10.5 : 12} fontWeight={800} pointerEvents="none">
          {area.corto}
        </text>
      )}

      {/* Fichas de cono */}
      {visibles.map((q, i) => {
        const fx = inicioX + (i % columnas) * (FICHA_W + 3);
        const fy = y + 25 + Math.floor(i / columnas) * (FICHA_H + 3);
        const n = nivelAlerta(q);
        const activa = qrSeleccionado === q.id;
        return (
          <g
            key={q.id}
            onClick={(e) => {
              if (modoMover) return; // en modo mover, el toque es para el taller
              e.stopPropagation();
              alTocarQr(q);
            }}
          >
            <title>{`Cono ${q.codigo_qr} · ${q.taller} · ${ESTILO_ALERTA[n].etiqueta}`}</title>
            <rect x={fx} y={fy} width={FICHA_W} height={FICHA_H} rx={3} fill={activa ? '#ffffff' : '#0f172a'} stroke={ESTILO_ALERTA[n].color} strokeWidth={activa ? 2 : 1.25} />
            <text
              x={fx + FICHA_W / 2}
              y={fy + FICHA_H / 2 + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9.5}
              fontWeight={800}
              fontFamily="var(--font-mono, ui-monospace, monospace)"
              fill={activa ? '#0f172a' : '#f8fafc'}
            >
              {q.unidades?.unidad_eco ?? q.codigo_qr}
            </text>
          </g>
        );
      })}
      {sobrantes > 0 && columnas > 0 && (
        <text
          x={inicioX + (visibles.length % columnas) * (FICHA_W + 3) + FICHA_W / 2}
          y={y + 25 + Math.floor(visibles.length / columnas) * (FICHA_H + 3) + FICHA_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight={800}
          fill="#e2e8f0"
          pointerEvents="none"
        >
          +{sobrantes}
        </text>
      )}

      {/* Contador */}
      {qrs.length > 0 && (
        <g pointerEvents="none">
          <circle cx={x + w - 4} cy={y + 4} r={10} fill={color!} stroke="#020617" strokeWidth={2.5} />
          <text x={x + w - 4} y={y + 4.5} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={900} fill="#020617">
            {qrs.length}
          </text>
        </g>
      )}
    </g>
  );
}

function Estacionamiento({ x, y, columnas, filas }: { x: number; y: number; columnas: number; filas: number }) {
  const cw = 28;
  const ch = 44;
  const lineas: string[] = [];
  for (let f = 0; f < filas; f++) {
    const fy = y + f * ch;
    lineas.push(`M${x} ${fy + ch}h${columnas * cw}`);
    for (let c = 0; c <= columnas; c++) lineas.push(`M${x + c * cw} ${fy + 4}v${ch - 4}`);
  }
  return <path d={lineas.join('')} stroke="#334155" strokeWidth={1.5} fill="none" pointerEvents="none" />;
}

function Rotulo({ x, y, texto }: { x: number; y: number; texto: string }) {
  return (
    <text x={x} y={y} fill="#64748b" fontSize={10} fontWeight={800} letterSpacing={4} pointerEvents="none">
      {texto}
    </text>
  );
}
