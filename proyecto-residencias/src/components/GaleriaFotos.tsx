'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Download, Trash2, X } from 'lucide-react';
import type { FotografiaUnidad } from '@/types/supabase';
import { ETAPAS_FOTO, formatearFecha } from '@/lib/constantes';
import { Insignia } from '@/components/ui';

/** Cuadrícula de fotos con visor a pantalla completa (flechas y Esc del teclado). */
export default function GaleriaFotos({
  fotos,
  alEliminar,
}: {
  fotos: FotografiaUnidad[];
  alEliminar?: (foto: FotografiaUnidad) => Promise<void>;
}) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const foto = abierta !== null ? fotos[abierta] : null;

  useEffect(() => {
    if (abierta === null) return;
    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierta(null);
      if (e.key === 'ArrowRight') setAbierta((i) => (i === null ? i : (i + 1) % fotos.length));
      if (e.key === 'ArrowLeft') setAbierta((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
    };
    window.addEventListener('keydown', teclado);
    return () => window.removeEventListener('keydown', teclado);
  }, [abierta, fotos.length]);

  const abrir = (i: number | null) => {
    setConfirmarBorrado(false);
    setAbierta(i);
  };

  const eliminar = async () => {
    if (!foto || !alEliminar) return;
    await alEliminar(foto);
    abrir(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {fotos.map((f, i) => (
          <button key={f.id} onClick={() => abrir(i)} className="group overflow-hidden rounded-xl bg-white text-left ring-1 ring-slate-200 transition hover:shadow-lg">
            <div className="relative aspect-[4/3] bg-slate-100">
              <Image src={f.url_publica} alt={`${f.etapa} ${f.seccion ?? ''}`} fill sizes="(min-width:1024px) 22vw, (min-width:640px) 30vw, 45vw" className="object-cover transition duration-300 group-hover:scale-105" />
              <span className="absolute left-2 top-2">
                <Insignia clase={ETAPAS_FOTO.find((e) => e.valor === f.etapa)?.clase ?? ''}>{f.etapa}</Insignia>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
              <span className="truncate font-semibold text-slate-700">{f.seccion ?? 'General'}</span>
              <span className="shrink-0 tabular-nums text-slate-400">{f.peso_kb} KB</span>
            </div>
          </button>
        ))}
      </div>

      {foto && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950/95 backdrop-blur" onClick={() => abrir(null)}>
          <div className="flex items-center justify-between gap-3 p-4 text-sm text-white" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0">
              <p className="font-semibold">
                {foto.etapa} · {foto.seccion ?? 'General'}
              </p>
              <p className="truncate text-xs text-slate-400">
                {formatearFecha(foto.created_at, true)} · {foto.subido_por} · {foto.peso_kb} KB
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <a href={foto.url_publica} target="_blank" rel="noreferrer" className="rounded-lg p-2 hover:bg-white/10" title="Abrir original">
                <Download className="h-5 w-5" />
              </a>
              {alEliminar &&
                (confirmarBorrado ? (
                  <button onClick={eliminar} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-500">
                    Confirmar borrado
                  </button>
                ) : (
                  <button onClick={() => setConfirmarBorrado(true)} className="rounded-lg p-2 hover:bg-white/10" title="Eliminar">
                    <Trash2 className="h-5 w-5" />
                  </button>
                ))}
              <button onClick={() => abrir(null)} className="rounded-lg p-2 hover:bg-white/10" title="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
            <Image src={foto.url_publica} alt={`${foto.etapa} ${foto.seccion ?? ''}`} fill sizes="100vw" className="object-contain" />
            {fotos.length > 1 && (
              <>
                <button onClick={() => abrir((abierta! - 1 + fotos.length) % fotos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Anterior">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button onClick={() => abrir((abierta! + 1) % fotos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Siguiente">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
          <p className="p-3 text-center text-xs text-slate-500">
            {abierta! + 1} / {fotos.length}
          </p>
        </div>
      )}
    </>
  );
}
